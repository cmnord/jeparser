# Jeparser

Jeparser is a browser extension which downloads Jeopardy games for offline
solving. It downloads the game into a JSON file.

![Mozilla Add-on version](https://img.shields.io/amo/v/jeparser@cmnord.github.com)
![Chrome Web Store version](https://img.shields.io/chrome-web-store/v/jdnkefcbnejlkgpdkoenaoannfokafge)

#### [[Download for Firefox](https://addons.mozilla.org/en-US/firefox/addon/jeparser/)] [[Download for Chrome](https://chrome.google.com/webstore/detail/jeparser/jdnkefcbnejlkgpdkoenaoannfokafge)]

<img width="500" alt="image" src="https://user-images.githubusercontent.com/14882297/221532033-ac6259a8-2ea2-47af-8e44-1d444861ccf2.png">

## Development

To run the app locally, first install local dependencies:

```sh
npm install
```

Then run the Webpack server:

```sh
npm run dev
```

Finally, run the `web-ext` development version of the extension with:

```sh
npm run start:firefox
```

Or for Chrome:

```sh
npm run start:chrome
```

Open
[`about:debugging#/runtime/this-firefox`](about:debugging#/runtime/this-firefox)
on Firefox in the development browser and click "Inspect" on the extension to
debug the extension.

![screenshot](/screenshot_1280x800.png)

## Publishing

This repository uses
[release-please](https://github.com/googleapis/release-please) to manage
releases.

It's possible to publish to both the Chrome Web Store and Mozilla Addons at once
by creating these ENV variables:

1. `EXTENSION_ID`, `CLIENT_ID`, `CLIENT_SECRET`, and `REFRESH_TOKEN` from
   [Google APIs][link-cws-keys].
1. `WEB_EXT_API_KEY`, and `WEB_EXT_API_SECRET` from [AMO][link-amo-keys].

Build the extension, then attempt to deploy it to both stores:

```sh
npm run release
```

## Thanks

- [WayneD/j-play](https://github.com/WayneD/j-play)
- [jpd236/CrosswordScraper](https://github.com/jpd236/CrosswordScraper)
- Templates:
  [orta/typescript-web-extension](https://github.com/orta/typescript-web-extension),
  [fregante/browser-extension-template](https://github.com/fregante/browser-extension-template)

## License

[MIT](https://github.com/cmnord/jeparser/blob/main/LICENSE) (c) [cmnord](https://github.com/cmnord/)

[link-cws-keys]: https://github.com/DrewML/chrome-webstore-upload/blob/master/How%20to%20generate%20Google%20API%20keys.md
[link-amo-keys]: https://addons.mozilla.org/en-US/developers/addon/api/key
