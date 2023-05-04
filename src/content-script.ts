import browser from "webextension-polyfill";

import { parseGame } from "./parser";

// On a message from the popup script, the content script parses the body of the
// page and returns it to the client in JSON form.
browser.runtime.onMessage.addListener(
	(message, _sender, sendResponse: (response?: any) => void) => {
		if (message.message === "parse") {
			const { game, error } = parseGame(document.body);
			sendResponse({ game, error });
		}
	}
);
