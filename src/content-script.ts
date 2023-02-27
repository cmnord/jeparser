import browser from "webextension-polyfill";

export interface Game {
	title: string;
	author: string;
	copyright: string;
	note: string;
	boards: Board[];
}

interface Board {
	categoryNames: string[];
	categories: Category[];
}

interface Category {
	name: string;
	clues: Clue[];
}

interface Clue {
	clue: string;
	answer: string;
	value: number;
}

const CORRECT_RESPONSE_PREFIX = '<em class="correct_response">';
const CORRECT_RESPONSE_SUFFIX = "</em>";

// On a message from the popup script, the content script parses the body of the
// page and returns it to the client in JSON form.
browser.runtime.onMessage.addListener(
	(message, _sender, sendResponse: (response?: any) => void) => {
		if (message.message === "parse") {
			const { game, error } = parseGame();
			sendResponse({ game, error });
		}
	}
);

/** parseGame parses the j-archive website and returns a representation of the
 * game in JSON. */
function parseGame() {
	try {
		const gameParser = new SoupGame(document);
		const game = gameParser.jsonify();
		return { game, error: "" };
	} catch (error: unknown) {
		if (error instanceof Error) {
			return { game: null, error: error.message };
		}
	}
	return { game: null, error: "unknown error" };
}

// Classes based on https://glitch.com/~jarchive-json
export class SoupGame {
	private title: string;
	private note: string;
	private j: SoupRound;
	private dj: SoupRound;
	private fj: FinalSoup;

	constructor(document: Document) {
		const title = document.querySelector("#game_title")?.textContent;
		if (!title) {
			throw new Error("could not find id game_title on page");
		}
		this.title = title;

		const note = document.querySelector("#game_comments")?.textContent;
		if (!note) {
			throw new Error("could not find id game_comments on page");
		}
		this.note = note;

		const jSoup = document.getElementById("jeopardy_round");
		if (!jSoup) {
			throw new Error("could not find id jeopardy_round on page");
		}
		this.j = new SoupRound(jSoup);
		this.j.parseAnswers(jSoup);

		const djSoup = document.getElementById("double_jeopardy_round");
		if (!djSoup) {
			throw new Error("could not find id double_jeopardy_round on page");
		}
		this.dj = new SoupRound(djSoup);
		this.dj.parseAnswers(djSoup);

		const fjSoup = document.getElementById("final_jeopardy_round");
		if (!fjSoup) {
			throw new Error("could not find id final_jeopardy_round on page");
		}
		this.fj = new FinalSoup(fjSoup);
		this.fj.addAnswer(fjSoup);
	}

	jsonify(): Game {
		return {
			title: this.title,
			author: "J! Archive",
			copyright: "Jeopardy!",
			note: this.note,
			boards: [this.j.jsonify(), this.dj.jsonify(), this.fj.jsonify()],
		};
	}
}

class FinalSoup {
	private category: string;
	private clue: string;
	private answer?: string;

	constructor(roundSoup: HTMLElement) {
		// clueSoup = roundSoup.find_all('td', class_='clue')
		const categoryNameSoup =
			roundSoup.querySelector(".category_name")?.textContent;
		if (!categoryNameSoup) {
			throw new Error("could not find class category_name on page");
		}
		this.category = categoryNameSoup;
		const clueTextSoup = roundSoup.querySelector(".clue_text")?.textContent;
		if (!clueTextSoup) {
			throw new Error("could not find class clue_text on page");
		}
		this.clue = clueTextSoup;
	}

	addAnswer(answerSoup: HTMLElement) {
		const categoryDiv = answerSoup.querySelector(".category");
		const mouseOverDiv = categoryDiv?.children[0];
		const mouseOverAttribute = mouseOverDiv?.getAttribute("onmouseover");
		const start = mouseOverAttribute?.indexOf(CORRECT_RESPONSE_PREFIX);
		const end = mouseOverAttribute?.indexOf(CORRECT_RESPONSE_SUFFIX);
		if (
			start !== undefined &&
			start !== -1 &&
			end !== undefined &&
			end !== -1
		) {
			const correctResponse = mouseOverAttribute?.substring(
				start + CORRECT_RESPONSE_PREFIX.length,
				end
			);
			this.answer = correctResponse;
			return;
		}
		throw new Error(
			"could not find correct response in final jeopardy element"
		);
	}

	printRound() {
		console.log();
		console.log(this.category);
		console.log(this.clue);
		console.log(this.answer);
	}

	jsonify() {
		const jsonData: Board = {
			categoryNames: [this.category],
			categories: [
				{
					name: this.category,
					clues: [
						{
							clue: this.clue,
							value: 0,
							answer: this.answer!,
						},
					],
				},
			],
		};
		return jsonData;
	}
}

class SoupRound {
	private categories: string[];
	private clues: SoupClue[];

	constructor(roundSoup: HTMLElement) {
		// Identify the Categories
		const categorySoup = roundSoup.getElementsByClassName("category_name"); // TODO: also td?
		this.categories = [];
		// console.log("\nCategories:");
		for (const cat of categorySoup) {
			this.categories.push(cat.textContent || "");
			// console.log(cat.text);
		}

		// Pull Clues
		let col = 0;
		const clueSoup = roundSoup.getElementsByClassName("clue"); // TODO: also td?
		this.clues = [];
		for (const clue of clueSoup) {
			this.clues.push(new SoupClue(clue, this.categories[col]));
			col += 1;
			if (col > 5) col = 0;
		}
	}

	parseAnswers(answerSoup: HTMLElement) {
		const soupClues = answerSoup.getElementsByClassName("clue"); // TODO: also td?

		for (let i = 0; i < soupClues.length; i++) {
			const answer = soupClues[i];
			if (i < this.clues.length) {
				this.clues[i].addAnswer(answer);
			}
		}
	}

	printRound() {
		for (const question of this.clues) {
			console.log("");
			console.log(question.category);
			console.log(question.value);
			console.log(question.clue);
			console.log(question.answer);
			console.log(question.order);
		}
	}

	getCategories() {
		const categories = new Map<string, number>();

		let numCategories = 0;
		for (const clue of this.clues) {
			if (!categories.has(clue.category)) {
				categories.set(clue.category, numCategories);
				numCategories++;
			}
		}

		return categories;
	}

	jsonify(): Board {
		const categories = this.getCategories();

		const jsonData: Board = {
			categoryNames: this.categories,
			categories: this.categories.map((c) => ({
				name: c,
				clues: [],
			})),
		};

		for (const clue of this.clues) {
			const categoryIdx = categories.get(clue.category);
			if (categoryIdx !== undefined) {
				const clueDict = {
					category: clue.category,
					value: clue.value,
					clue: clue.clue,
					answer: clue.answer!,
					order: clue.order,
				};
				jsonData.categories[categoryIdx].clues.push(clueDict);
			}
		}
		return jsonData;
	}
}

class SoupClue {
	clue: string;
	category: string;
	value: number;
	order: number;
	answer?: string;
	isDailyDouble: boolean;

	constructor(clueSoup: Element, category: string) {
		// Identify Clue Text and Category
		try {
			const soupText = clueSoup.querySelector(".clue_text")?.textContent;
			if (!soupText) {
				throw new Error("could not find class clue_text on page");
			}
			this.clue = soupText;
		} catch (error: unknown) {
			// AttributeError
			this.clue = "Unrevealed";
		}
		this.category = category;

		// Find Clue Value
		try {
			const valueStr = clueSoup
				.querySelector(".clue_value")
				?.textContent?.slice(1);
			this.value = parseInt(valueStr ?? "");
			this.isDailyDouble = false;
		} catch (error: unknown) {
			// AttributeError
			this.value = 0;
			this.isDailyDouble = true;
		}

		// Find Order of Clue in Round
		try {
			const orderStr =
				clueSoup.querySelector(".clue_order_number")?.textContent;
			this.order = parseInt(orderStr ?? "");
		} catch (error: unknown) {
			// AttributeError
			this.order = 100;
		}
	}

	addAnswer(answerSoup: Element) {
		try {
			const soupResult =
				answerSoup.querySelector(".correct_response")?.textContent;
			if (!soupResult) {
				throw new Error(
					"could not find class correct_response in clue element"
				);
			}
			this.answer = soupResult;
		} catch (error: unknown) {
			// AttributeError
			this.answer = "Mystery";
		}
	}
}

export {};
