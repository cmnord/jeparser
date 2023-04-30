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

/** ERROR_PLACEHOLDER is used when a field has an error. */
const ERROR_PLACEHOLDER = "***ERROR***";

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

interface Response {
	game: Game;
	error?: string;
}

/** parseGame parses the j-archive website and returns a representation of the
 * game in JSON.
 */
function parseGame() {
	const gameParser = new GameParser(document);
	return gameParser.jsonify();
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
	private errors: string[];

	constructor(document: Document) {
		this.errors = [];

		const title = document.querySelector("#game_title")?.textContent;
		if (!title) {
			this.errors.push("could not find id game_title on page");
			this.title = ERROR_PLACEHOLDER;
		} else {
			this.title = title;
		}

		const note = document.querySelector("#game_comments")?.textContent;
		this.note = note ?? "";

		const jDiv = document.getElementById("jeopardy_round");
		this.j = new BoardParser(0, jDiv);

		const djDiv = document.getElementById("double_jeopardy_round");
		this.dj = new BoardParser(1, djDiv);

		const fjDiv = document.getElementById("final_jeopardy_round");
		this.fj = new FinalBoardParser(fjDiv);
	}

	jsonify(): Response {
		const { board: jBoard, error: jError } = this.j.jsonify();
		const { board: djBoard, error: djError } = this.dj.jsonify();
		const { board: fjBoard, error: fjError } = this.fj.jsonify();

		const game: Game = {
			title: this.title,
			author: "J! Archive",
			copyright: "Jeopardy!",
			note: this.note,
			boards: [jBoard, djBoard, fjBoard],
		};

		const errors = [...this.errors, jError, djError, fjError].filter(
			(e): e is string => e !== undefined
		);
		const error = errors.length ? errors.join("\n") : undefined;
		return { game, error };
	}
}

/** parseCorrectResponse parses the onmouseover attribute of the clue header
 * element to find the correct response. */
function parseCorrectResponse(answerText: string) {
	// Remove HTML tags
	const responseStr = answerText.replace(/<[^>]*>/g, "");
	// Replace backslash-escaped quotes
	return responseStr.replace(/\\'/g, "'");
}

class FinalBoardParser {
	private category: string;
	private clue: string;
	private answer: string;
	private errors: string[];

	constructor(roundDiv: HTMLElement | null) {
		this.errors = [];

		if (!roundDiv) {
			this.errors.push("could not find final jeopardy round on page");
		}

		const categoryName = roundDiv?.querySelector(".category_name")?.textContent;
		if (!categoryName) {
			this.errors.push("could not find class category_name on page");
			this.category = ERROR_PLACEHOLDER;
		} else {
			this.category = categoryName;
		}

		const clueText = roundDiv?.querySelector(".clue_text")?.textContent;
		if (!clueText) {
			this.errors.push("could not find class clue_text on page");
			this.clue = ERROR_PLACEHOLDER;
		} else {
			this.clue = clueText;
		}

		const answerText =
			roundDiv?.querySelector(".correct_response")?.textContent;
		if (!answerText) {
			this.errors.push("could not find class correct_response in final round");
			this.answer = ERROR_PLACEHOLDER;
		} else {
			this.answer = parseCorrectResponse(answerText);
		}
	}

	jsonify(): { board: Board; error?: string } {
		const board: Board = {
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
		const error = this.errors.length ? this.errors.join("\n") : undefined;
		return { board, error };
	}
}

class BoardParser {
	private categories: {
		name: string;
		note: string;
		clues: ClueParser[];
	}[];
	private errors: string[];

	constructor(round: number, roundDiv: HTMLElement | null) {
		this.errors = [];

		if (!roundDiv) {
			this.errors.push("could not find round " + round + " on page");
		}
		const categoryDivs = roundDiv
			? roundDiv.getElementsByClassName("category")
			: [];
		this.categories = new Array(categoryDivs.length);

		for (let i = 0; i < categoryDivs.length; i++) {
			const categoryDiv = categoryDivs[i];
			const categoryName =
				categoryDiv.querySelector(".category_name")?.textContent;

			let name: string;
			if (!categoryName) {
				this.errors.push(
					`could not find class category_name in category ${i} round ${round}`
				);
				name = ERROR_PLACEHOLDER;
			} else {
				name = categoryName;
			}

			let note = categoryDiv.querySelector(".category_comments")?.textContent;
			if (note) {
				// Change (Speaker: <note>) to <note>
				note = note.replace(/\(\w+: (.*)\)/, "$1");
			}

			this.categories[i] = {
				name,
				note: note ?? "",
				clues: [],
			};
		}

		// Pull Clues
		let col = 0;
		const clueDivs = roundDiv ? roundDiv.getElementsByClassName("clue") : [];
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

	jsonify(): { board: Board; error?: string } {
		const errors = [...this.errors];

		const categoryNames = this.categories.map((cat) => cat.name);

		const board: Board = {
			categoryNames,
			categories: this.categories.map((cat) => ({
				name: cat.name,
				note: cat.note,
				clues: cat.clues.map((clueParser) => {
					const { clue, error } = clueParser.jsonify();
					if (error) {
						errors.push(error);
					}
					return clue;
				}),
			})),
		};

		const error = errors.length ? errors.join("\n") : undefined;
		return { board, error };
	}
}

class ClueParser {
	private clue: string;
	private value: number;
	private answer: string;
	private wagerable?: boolean;
	private errors: string[];

	constructor(clueDiv: Element, i: number, j: number, round: number) {
		this.errors = [];
		let unrevealed = false;

		// Identify Clue Text
		const clue = clueDiv.querySelector(".clue_text")?.textContent;
		if (!clue) {
			unrevealed = true;
			this.clue = "Unrevealed";
		} else {
			this.clue = clue;
		}

		// Find Clue Value
		const clueValueText = clueDiv.querySelector(".clue_value")?.textContent;
		const clueValueDDText = clueDiv.querySelector(
			".clue_value_daily_double"
		)?.textContent;

		if (clueValueText) {
			if (!clueValueText.startsWith("$")) {
				this.errors.push(`clue value (${i}, ${j}) does not start with '$'`);
			}
			const clueValue = parseInt(clueValueText.slice(1));
			if (isNaN(clueValue)) {
				this.errors.push(
					`could not parse clue value (${i}, ${j}) text ${clueValueText}`
				);
			}
			this.value = clueValue;
		} else if (clueValueDDText) {
			if (!clueValueDDText.startsWith("DD: $")) {
				this.errors.push(
					`DD clue value (${i}, ${j}) does not start with 'DD: $'`
				);
			}
			this.value = getExpectedClueValue(i, round);
			this.wagerable = true;
		} else {
			// Unrevealed
			this.value = getExpectedClueValue(i, round);
		}

		const answerText = clueDiv.querySelector(".correct_response")?.textContent;
		if (!answerText) {
			if (unrevealed) {
				this.answer = "Unrevealed";
			} else {
				this.errors.push(
					`could not find class correct_response in round ${round}, clue (${i}, ${j})`
				);
				this.answer = ERROR_PLACEHOLDER;
			}
		} else {
			this.answer = parseCorrectResponse(answerText);
		}
	}

	jsonify(): { clue: Clue; error?: string } {
		const clue: Clue = {
			clue: this.clue,
			answer: this.answer,
			value: this.value,
			wagerable: this.wagerable,
		};
		const error = this.errors.length ? this.errors.join("\n") : undefined;
		return { clue, error };
	}
}

export {};
