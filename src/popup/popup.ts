import browser from "webextension-polyfill";

import { Game } from "src/content-script";

interface Response {
	game: Game | null;
	error?: string;
}

const CONTENT_SCRIPT_PERMISSION_ERROR =
	"Could not establish connection. Receiving end does not exist.";

async function main() {
	try {
		const game = await requestGame();
		showGame(game);
	} catch (error: unknown) {
		if (error instanceof Error) {
			reportExecuteScriptError(error.message);
		}
	}
}

/** requestGame sends a message to the content script when the popup opens to get
 * the content of the page. */
async function requestGame() {
	const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
	const tabId = tab.id;
	if (!tabId) {
		throw new Error("could not find active tab ID");
	}

	try {
		const response: Response = await browser.tabs.sendMessage(tabId, {
			message: "parse",
		});
		const game = response.game;
		if (response.error) {
			throw new Error(response.error);
		}
		if (!game) {
			throw new Error("game missing from response");
		}
		return game;
	} catch (error: unknown) {
		if (error instanceof Error) {
			if (error.message === CONTENT_SCRIPT_PERMISSION_ERROR) {
				throw new Error("Open a J! Archive game to run this extension.");
			}
			throw error;
		}
		throw new Error("unknown error");
	}
}

/** There was an error executing the script.  Display the popup's error message,
 * and hide the normal UI. */
function reportExecuteScriptError(error: string) {
	document.querySelector("#popup-content")?.classList.add("hidden");
	const errorDiv = document.querySelector("#error-content");
	if (errorDiv) {
		errorDiv.classList.remove("hidden");
		errorDiv.textContent = error;
	}
	console.error(`Failed to execute content script: ${error}`);
}

/** showGame renders the game JSON in the extension popup and presents a button
 * to download it. */
function showGame(game: Game) {
	const stringifiedGame = JSON.stringify(game, null, "\t");
	const gameDiv = document.querySelector("#game");
	if (gameDiv) {
		gameDiv.classList.remove("hidden");
		gameDiv.textContent = stringifiedGame;
	}
	const downloadLink = document.querySelector("#download-link");
	if (downloadLink) {
		downloadLink.setAttribute(
			"href",
			"data:text/plain;charset=utf-8," + encodeURIComponent(stringifiedGame)
		);
		const fileName = game.title.replace(/[^a-z0-9]/gi, "_").toLowerCase();
		downloadLink.setAttribute("download", fileName + ".jep.json");
	}
	const downloadButton = document.querySelector("#download-button");
	if (downloadButton) {
		downloadButton.attributes.removeNamedItem("disabled");
	}
}

(async () => {
	await main();
})();

export {};
