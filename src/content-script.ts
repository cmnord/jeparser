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
	note: string;
	clues: Clue[];
}

interface Clue {
	clue: string;
	answer: string;
	value: number;
	/** wagerable clues allow players to wager on the answer and win or lose that
	 * value instead of the clue's value.
	 */
	wagerable?: boolean;
	/** longForm means that all players may write down their answers to this clue
	 * over a longer time period instead of competing to buzz in.
	 */
	longForm?: boolean;
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
 * game in JSON.
 */
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

/** getExpectedClueValue gets the expected clue value based on its position in
 * the board before revealing it. Otherwise, the clue value for wagerable or
 * unrevealed clues would be 0.
 */
function getExpectedClueValue(i: number, round: number) {
	return (i + 1) * 200 * (round + 1);
}

// Classes based on https://glitch.com/~jarchive-json
export class GameParser {
	private title: string;
	private note: string;
	private j: BoardParser;
	private dj: BoardParser;
	private fj: FinalBoardParser;

	constructor(document: Document) {
		const title = document.querySelector("#game_title")?.textContent;
		if (!title) {
			throw new NotFoundError("could not find id game_title on page");
		}
		this.title = title;

		const note = document.querySelector("#game_comments")?.textContent;
		this.note = note ?? "";

		const jDiv = document.getElementById("jeopardy_round");
		if (!jDiv) {
			throw new NotFoundError("could not find id jeopardy_round on page");
		}
		this.j = new BoardParser(jDiv, 0);

		const djDiv = document.getElementById("double_jeopardy_round");
		if (!djDiv) {
			throw new NotFoundError(
				"could not find id double_jeopardy_round on page"
			);
		}
		this.dj = new BoardParser(djDiv, 1);

		const fjDiv = document.getElementById("final_jeopardy_round");
		if (!fjDiv) {
			throw new NotFoundError("could not find id final_jeopardy_round on page");
		}
		this.fj = new FinalBoardParser(fjDiv);
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
		const responseHtml = mouseOverAttribute.substring(
			start + CORRECT_RESPONSE_PREFIX.length,
			end
		);
		// Remove HTML tags
		const responseStr = responseHtml.replace(/<[^>]*>/g, "");
		// Replace backslash-escaped quotes
		return responseStr.replace(/\\'/g, "'");
	}
	throw new NotFoundError("could not find correct response in element " + name);
}

class FinalBoardParser {
	private category: string;
	private clue: string;
	private answer: string;

	constructor(roundDiv: HTMLElement) {
		const categoryName = roundDiv.querySelector(".category_name")?.textContent;
		if (!categoryName) {
			throw new NotFoundError("could not find class category_name on page");
		}
		this.category = categoryName;
		const clueText = roundDiv.querySelector(".clue_text")?.textContent;
		if (!clueText) {
			throw new NotFoundError("could not find class clue_text on page");
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
					note: "",
					clues: [
						{
							clue: this.clue,
							value: 0,
							answer: this.answer,
							wagerable: true,
							longForm: true,
						},
					],
				},
			],
		};
		return jsonData;
	}
}

class BoardParser {
	private categories: {
		name: string;
		note: string;
		clues: ClueParser[];
	}[];

	constructor(roundDiv: HTMLElement, round: number) {
		const categoryDivs = roundDiv.getElementsByClassName("category");
		this.categories = new Array(categoryDivs.length);

		for (let i = 0; i < categoryDivs.length; i++) {
			const categoryDiv = categoryDivs[i];
			const categoryName =
				categoryDiv.querySelector(".category_name")?.textContent;
			if (!categoryName) {
				throw new NotFoundError(
					`could not find class category_name in category ${i} round ${round}`
				);
			}
			let note = categoryDiv.querySelector(".category_comments")?.textContent;
			if (note) {
				// Change (Speaker: <note>) to <note>
				note = note.replace(/\(\w+: (.*)\)/, "$1");
			}
			this.categories[i] = {
				name: categoryName,
				note: note ?? "",
				clues: [],
			};
		}

		// Pull Clues
		let col = 0;
		const clueDivs = roundDiv.getElementsByClassName("clue");
		let row = 0;
		for (const clueDiv of clueDivs) {
			this.categories[col].clues.push(new ClueParser(clueDiv, row, col, round));
			col += 1;
			if (col > 5) {
				col = 0;
				row += 1;
			}
		}
	}

	jsonify(): Board {
		const categoryNames = this.categories.map((cat) => cat.name);
		return {
			categoryNames,
			categories: this.categories.map((cat) => ({
				name: cat.name,
				note: cat.note,
				clues: cat.clues.map((clue) => clue.jsonify()),
			})),
		};
	}
}

class ClueParser {
	clue: string;
	value: number;
	answer: string;
	wagerable?: boolean;
	i: number;
	j: number;

	constructor(clueDiv: Element, i: number, j: number, round: number) {
		this.i = i;
		this.j = j;
		// Identify Clue Text
		const clue = clueDiv.querySelector(".clue_text")?.textContent;
		this.clue = clue ?? "Unrevealed";

		// Find Clue Value
		const clueValueText = clueDiv.querySelector(".clue_value")?.textContent;
		const clueValueDDText = clueDiv.querySelector(
			".clue_value_daily_double"
		)?.textContent;

		if (clueValueText) {
			if (!clueValueText.startsWith("$")) {
				throw new Error("clue value does not start with '$'");
			}
			const clueValue = parseInt(clueValueText.slice(1));
			if (isNaN(clueValue)) {
				throw new Error("could not parse clue value " + clueValueText);
			}
			this.value = clueValue;
		} else if (clueValueDDText) {
			if (!clueValueDDText.startsWith("DD: $")) {
				throw new Error("DD clue value does not start with 'DD: $'");
			}
			this.value = getExpectedClueValue(i, round);
			this.wagerable = true;
		} else {
			// Unrevealed
			this.value = getExpectedClueValue(i, round);
		}

		const mouseOverDiv =
			clueDiv.children[0]?.children[0]?.children[0]?.children[0]?.children[0];
		try {
			this.answer = parseCorrectResponse(mouseOverDiv, `clue ${i}, ${j}`);
		} catch (error: unknown) {
			if (isNotFoundError(error)) {
				this.answer = "Unrevealed";
			} else {
				throw error;
			}
		}
	}

	jsonify(): Clue {
		return {
			clue: this.clue,
			answer: this.answer,
			value: this.value,
			wagerable: this.wagerable,
		};
	}
}

export {};
