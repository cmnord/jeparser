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

// On a message from the popup script, the content script parses the body of the
// page and returns it to the client in JSON form.
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
	if (message.message === "parse") {
		const { game, error } = parseGame();
		sendResponse({ game, error });
	}
});

/** parseGame parses the j-archive website and returns a representation of the
 * game in JSON. */
function parseGame() {
	const title = document.querySelector("#game_title")?.textContent;
	if (!title) {
		return { game: null, error: "could not find game title" };
	}
	const note = document.querySelector("#game_comments")?.textContent;

	const game: Game = {
		title,
		author: "J! Archive",
		copyright: "Jeopardy! game show",
		note: note || "",
		boards: [],
	};

	// TODO: boards

	return { game, error: "" };
}

export {};
