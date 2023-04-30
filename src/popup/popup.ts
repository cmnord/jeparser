import browser from "webextension-polyfill";

import { Game } from "src/content-script";

interface Response {
	game: Game;
	error?: string;
}

const CONTENT_SCRIPT_PERMISSION_ERROR =
	"Could not establish connection. Receiving end does not exist.";

async function main() {
	try {
		const { game, error } = await requestGame();
		showGame(game);
		reportExecuteScriptError(error);
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
		return response;
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

/** There was an error executing the script. Display the popup's error message.
 */
function reportExecuteScriptError(error?: string) {
	const errorDiv = document.querySelector("#error-content");
	if (!errorDiv) {
		throw new Error("could not find error element");
	}

	if (!error) {
		errorDiv.classList.add("hidden");
		return;
	}

	errorDiv.classList.remove("hidden");
	errorDiv.textContent = error;
	console.error(`Failed to execute content script: ${error}`);
}

/** showGame renders the game JSON in the extension popup and presents a button
 * to download it. */
function showGame(game: Game) {
	const stringifiedGame = JSON.stringify(game, null, "\t");
	const gameElement = document.querySelector("#game");
	if (!gameElement) {
		throw new Error("could not find game element");
	}

	gameElement.textContent = stringifiedGame;
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
