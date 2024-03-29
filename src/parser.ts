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
	/** imageSrc is the URL of an image to display with the clue.
	 */
	imageSrc?: string;
}

/** ERROR_PLACEHOLDER is used when a field has an error. */
const ERROR_PLACEHOLDER = "***ERROR***";
/** UNREVEALED_PLACEHOLDER is used when a field was not revealed in the game playthrough. */
const UNREVEALED_PLACEHOLDER = "***Unrevealed***";
/** MISSING_PLACEHOLDER is used when a field was not recorded on j-archive.  */
const MISSING_PLACEHOLDER = "***Missing***";

/** MISSING_CLUE_FLAG is used by j-archive when a clue was not recorded. */
const MISSING_CLUE_FLAG = "=";

/** VALUE_DOUBLING_DATE is the day that clue values were doubled. */
const VALUE_DOUBLING_DATE = new Date(2001, 11 - 1, 26);

/** TITLE_REGEX contains a capture group for the month, day, and year.
 * Example: "Show #3966 - Monday, November 26, 2001"
 */
const TITLE_REGEX = /#\d+ - \w+, (\w+ \d+, \d+)/;
/** HTML_REGEX is used to remove HTML tags. */
const HTML_REGEX = /<[^>]*>/g;
/** QUOTE_REGEX is used to replace backslash-escaped quotes with just '. */
const QUOTE_REGEX = /'/g;
/** SPEAKER_REGEX is used to replace (Speaker: <note>) with just <note>. */
const SPEAKER_REGEX = /\(\w+: (.*)\)/;

/** parseGame parses the j-archive website and returns a representation of the
 * game in JSON.
 */
export function parseGame(element: HTMLElement) {
	const gameParser = new GameParser(element);
	return gameParser.jsonify();
}

/** getClueValueMultiplier checks if the game occurred before or after the
 * VALUE_DOUBLING_DATE.
 */
function getClueValueMultiplier(title: string): 1 | 2 {
	const matches = title.match(TITLE_REGEX);
	if (!matches) {
		throw new Error("could not parse title " + title);
	}
	const date = new Date(Date.parse(matches[1]));
	if (date < VALUE_DOUBLING_DATE) {
		return 1;
	}
	return 2;
}

/** getExpectedClueValue gets the expected clue value based on its position in
 * the board before revealing it. Otherwise, the clue value for wagerable or
 * unrevealed clues would be 0.
 */
function getExpectedClueValue(i: number, round: number, multiplier: 1 | 2) {
	return 100 * (i + 1) * (round + 1) * multiplier;
}

function sanitizeURL(rawURL: string) {
	try {
		const url = new URL(rawURL);
		if (url.protocol !== "http:" && url.protocol !== "https:") {
			throw new Error("invalid protocol " + url.protocol);
		}
		return { url: url.toString(), error: null };
	} catch (error: unknown) {
		if (error instanceof Error) {
			return { url: "", error: error.message };
		}
		return { url: "", error: "unknown error" };
	}
}

// Classes based on https://glitch.com/~jarchive-json
export class GameParser {
	private title: string;
	private note: string;
	private j?: BoardParser;
	private dj?: BoardParser;
	private fj?: FinalBoardParser;
	private errors: string[];

	constructor(root: HTMLElement) {
		this.errors = [];

		const title = root.querySelector("#game_title")?.textContent;
		if (!title) {
			this.errors.push("could not find id game_title on page");
			this.title = ERROR_PLACEHOLDER;
		} else {
			this.title = title;
		}
		const multiplier = getClueValueMultiplier(this.title);

		const note = root.querySelector("#game_comments")?.textContent;
		this.note = note ?? "";

		const jDiv = root.querySelector<HTMLElement>("#jeopardy_round");
		if (jDiv) {
			this.j = new BoardParser(0, jDiv, multiplier);
		}

		const djDiv = root.querySelector<HTMLElement>("#double_jeopardy_round");
		if (djDiv) {
			this.dj = new BoardParser(1, djDiv, multiplier);
		}

		const fjDiv = root.querySelector<HTMLElement>("#final_jeopardy_round");
		if (fjDiv) {
			this.fj = new FinalBoardParser(fjDiv);
		}
	}

	jsonify() {
		const game: Game = {
			title: this.title,
			author: "J! Archive",
			copyright: "Jeopardy!",
			note: this.note,
			boards: [],
		};

		const errors = [...this.errors];

		if (this.j && !this.j.isEmpty()) {
			const { board, error } = this.j.jsonify();
			game.boards.push(board);
			if (error) errors.push(error);
		}
		if (this.dj && !this.dj.isEmpty()) {
			const { board, error } = this.dj.jsonify();
			game.boards.push(board);
			if (error) errors.push(error);
		}
		if (this.fj) {
			const { board, error } = this.fj.jsonify();
			game.boards.push(board);
			if (error) errors.push(error);
		}

		const error = errors.length ? errors.join("\n") : undefined;
		return { game, error };
	}
}

/** parseCorrectResponse parses the .correct_response element into plain text. */
function parseCorrectResponse(answerText: string) {
	// Remove HTML tags
	const responseStr = answerText.replace(HTML_REGEX, "");
	// Replace backslash-escaped quotes
	return responseStr.replace(QUOTE_REGEX, "'");
}

class FinalBoardParser {
	private category: string;
	private clue: string;
	private answer: string;
	private imageSrc?: string;
	private errors: string[];

	constructor(roundDiv: HTMLElement) {
		this.errors = [];

		const categoryName = roundDiv?.querySelector(".category_name")?.textContent;
		if (!categoryName) {
			this.errors.push("could not find class category_name in final round");
			this.category = ERROR_PLACEHOLDER;
		} else {
			this.category = categoryName;
		}

		const clueTextElement = roundDiv?.querySelector(".clue_text");
		const clueText = clueTextElement?.textContent;
		if (!clueText) {
			this.errors.push("could not find class clue_text in final round");
			this.clue = ERROR_PLACEHOLDER;
		} else {
			this.clue = clueText;
		}

		const clueImageLinks = clueTextElement?.getElementsByTagName("a");
		if (clueImageLinks?.length) {
			const { url, error } = sanitizeURL(clueImageLinks[0].href);
			this.imageSrc = url;
			if (error) {
				this.errors.push(`could not parse image URL in final round: ${error}`);
			}
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

	constructor(round: number, roundDiv: HTMLElement, multiplier: 1 | 2) {
		this.errors = [];

		const categoryDivs = roundDiv.getElementsByClassName("category");
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
			} else if (categoryName === MISSING_CLUE_FLAG) {
				name = MISSING_PLACEHOLDER;
			} else {
				name = categoryName;
			}

			let note = categoryDiv.querySelector(".category_comments")?.textContent;
			if (note) {
				// Change (Speaker: <note>) to <note>
				note = note.replace(SPEAKER_REGEX, "$1");
			}

			this.categories[i] = {
				name,
				note: note ?? "",
				clues: [],
			};
		}

		// Pull Clues
		let col = 0;
		const clueDivs = roundDiv.getElementsByClassName("clue");
		let row = 0;
		for (const clueDiv of clueDivs) {
			this.categories[col].clues.push(
				new ClueParser(clueDiv, row, col, round, multiplier)
			);
			col += 1;
			if (col > 5) {
				col = 0;
				row += 1;
			}
		}
	}

	/** isEmpty checks if every clue in the board is empty. */
	isEmpty() {
		return this.categories.every((cat) =>
			cat.clues.every((clue) => clue.isEmpty())
		);
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
	private imageSrc?: string;
	private errors: string[];

	constructor(
		clueDiv: Element,
		i: number,
		j: number,
		round: number,
		multiplier: 1 | 2
	) {
		this.errors = [];
		let unrevealed = false;

		// Identify Clue Text
		const clueTextElement = clueDiv.querySelector(".clue_text");
		const clueText = clueTextElement?.textContent;
		if (!clueText) {
			unrevealed = true;
			this.clue = UNREVEALED_PLACEHOLDER;
		} else if (clueText === MISSING_CLUE_FLAG) {
			this.clue = MISSING_PLACEHOLDER;
		} else {
			this.clue = clueText;
		}

		const clueImageLinks = clueTextElement?.getElementsByTagName("a");
		if (clueImageLinks?.length) {
			const { url, error } = sanitizeURL(clueImageLinks[0].href);
			this.imageSrc = url;
			if (error) {
				this.errors.push(
					`could not parse image URL in round ${round}, clue (${i}, ${j}): ${error}`
				);
			}
		}

		// Find Clue Value
		const clueValueText = clueDiv.querySelector(".clue_value")?.textContent;
		const clueValueDDText = clueDiv.querySelector(
			".clue_value_daily_double"
		)?.textContent;

		if (clueValueText) {
			const startIdx = clueValueText.startsWith("$") ? 1 : 0;
			const clueValue = parseInt(clueValueText.slice(startIdx));
			if (isNaN(clueValue)) {
				this.errors.push(
					`could not parse value of round ${round}, clue (${i}, ${j}): ${clueValueText}`
				);
			}
			this.value = clueValue;
		} else if (clueValueDDText) {
			if (!clueValueDDText.startsWith("DD: ")) {
				this.errors.push(
					`DD value of round ${round}, clue (${i}, ${j}) does not start with 'DD: '`
				);
			}
			this.value = getExpectedClueValue(i, round, multiplier);
			this.wagerable = true;
		} else {
			// Unrevealed
			this.value = getExpectedClueValue(i, round, multiplier);
		}

		const answerText = clueDiv.querySelector(".correct_response")?.textContent;
		if (unrevealed) {
			this.answer = UNREVEALED_PLACEHOLDER;
		} else if (answerText === MISSING_CLUE_FLAG) {
			this.answer = MISSING_PLACEHOLDER;
		} else if (!answerText) {
			this.errors.push(
				`could not find class correct_response in round ${round}, clue (${i}, ${j})`
			);
			this.answer = ERROR_PLACEHOLDER;
		} else {
			this.answer = parseCorrectResponse(answerText);
		}
	}

	/** isEmpty checks if the clue and answer are both missing or unrevealed. */
	isEmpty() {
		return (
			(this.clue === MISSING_PLACEHOLDER ||
				this.clue === UNREVEALED_PLACEHOLDER) &&
			(this.answer === MISSING_PLACEHOLDER ||
				this.answer === UNREVEALED_PLACEHOLDER)
		);
	}

	jsonify(): { clue: Clue; error?: string } {
		const clue: Clue = {
			clue: this.clue,
			answer: this.answer,
			value: this.value,
			wagerable: this.wagerable,
			imageSrc: this.imageSrc,
		};
		const error = this.errors.length ? this.errors.join("\n") : undefined;
		return { clue, error };
	}
}

export {};
