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

class NotFoundError extends Error {
	constructor(message?: string) {
		super(message);
		this.name = "NotFoundError";
	}
}

function isNotFoundError(error: unknown): error is NotFoundError {
	return error instanceof Error && error.name === "NotFoundError";
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
		const gameParser = new GameParser(document);
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
export class GameParser {
	private title: string;
	private note: string;
	private j: RoundParser;
	private dj: RoundParser;
	private fj: FinalRoundParser;

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

		const jDiv = document.getElementById("jeopardy_round");
		if (!jDiv) {
			throw new Error("could not find id jeopardy_round on page");
		}
		this.j = new RoundParser(jDiv);

		const djDiv = document.getElementById("double_jeopardy_round");
		if (!djDiv) {
			throw new Error("could not find id double_jeopardy_round on page");
		}
		this.dj = new RoundParser(djDiv);

		const fjDiv = document.getElementById("final_jeopardy_round");
		if (!fjDiv) {
			throw new Error("could not find id final_jeopardy_round on page");
		}
		this.fj = new FinalRoundParser(fjDiv);
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

/** parseCorrectResponse parses the onmouseover attribute of the clue header
 * element to find the correct response. */
function parseCorrectResponse(hoverElement: Element | undefined, name: string) {
	const mouseOverAttribute = hoverElement?.getAttribute("onmouseover");
	if (!mouseOverAttribute) {
		throw new NotFoundError(
			"could not find onmouseover attribute inside element " + name
		);
	}
	const start = mouseOverAttribute.indexOf(CORRECT_RESPONSE_PREFIX);
	const end = mouseOverAttribute.indexOf(CORRECT_RESPONSE_SUFFIX);
	if (start !== undefined && start !== -1 && end !== undefined && end !== -1) {
		const correctResponse = mouseOverAttribute.substring(
			start + CORRECT_RESPONSE_PREFIX.length,
			end
		);
		return correctResponse;
	}
	throw new NotFoundError("could not find correct response in element " + name);
}

class FinalRoundParser {
	private category: string;
	private clue: string;
	private answer: string;

	constructor(roundDiv: HTMLElement) {
		const categoryName = roundDiv.querySelector(".category_name")?.textContent;
		if (!categoryName) {
			throw new Error("could not find class category_name on page");
		}
		this.category = categoryName;
		const clueText = roundDiv.querySelector(".clue_text")?.textContent;
		if (!clueText) {
			throw new Error("could not find class clue_text on page");
		}
		this.clue = clueText;

		const categoryDiv = roundDiv.querySelector(".category");
		const mouseOverDiv = categoryDiv?.children[0];
		this.answer = parseCorrectResponse(mouseOverDiv, "final jeopardy");
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

class RoundParser {
	private categories: string[];
	private clues: ClueParser[];

	constructor(roundDiv: HTMLElement) {
		// Identify the Categories
		const categoryDivs = roundDiv.getElementsByClassName("category_name"); // TODO: also td?
		this.categories = [];
		for (const cat of categoryDivs) {
			this.categories.push(cat.textContent || "");
		}

		// Pull Clues
		let col = 0;
		const clueDivs = roundDiv.getElementsByClassName("clue"); // TODO: also td?
		this.clues = [];
		let row = 0;
		for (const clue of clueDivs) {
			this.clues.push(new ClueParser(clue, this.categories[col], row, col));
			col += 1;
			row += 1;
			if (col > 5) col = 0;
			if (row > 4) row = 0;
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

class ClueParser {
	clue: string;
	category: string;
	value: number;
	order: number;
	answer: string;
	isDailyDouble: boolean;
	i: number;
	j: number;

	constructor(clueDiv: Element, category: string, i: number, j: number) {
		this.i = i;
		this.j = j;
		// Identify Clue Text and Category
		try {
			const clue = clueDiv.querySelector(".clue_text")?.textContent;
			if (!clue) {
				throw new Error(
					`could not find class clue_text on page for clue ${i}, ${j}`
				);
			}
			this.clue = clue;
		} catch (error: unknown) {
			// AttributeError
			this.clue = "Unrevealed";
		}
		this.category = category;

		// Find Clue Value
		try {
			const valueStr = clueDiv
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
			const orderStr = clueDiv.querySelector(".clue_order_number")?.textContent;
			this.order = parseInt(orderStr ?? "");
		} catch (error: unknown) {
			// AttributeError
			this.order = 100;
		}

		const mouseOverDiv =
			clueDiv.children[0]?.children[0]?.children[0]?.children[0]?.children[0];
		try {
			const answer = parseCorrectResponse(mouseOverDiv, `clue ${i}, ${j}`);
			this.answer = answer;
		} catch (error: unknown) {
			if (isNotFoundError(error)) {
				this.answer = "Unrevealed";
			} else {
				throw error;
			}
		}
	}
}

export {};
