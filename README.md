# Jeparser

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
npm run start:firefox # or your browser of choice
```

Open
[about:debugging#/runtime/this-firefox](about:debugging#/runtime/this-firefox)
on Firefox in the development browser and click "Inspect" on the extension to
debug the extension.

## Features

- Use modern Promise-based `browser.*` APIs [webextension-polyfill][link-webext-polyfill].
- [Auto-publishing](#publishing) with auto-versioning and support for manual releases.

### Publishing

It's possible to publish to both the Chrome Web Store and Mozilla Addons at once by creating these ENV variables:

1. `CLIENT_ID`, `CLIENT_SECRET`, and `REFRESH_TOKEN` from [Google APIs][link-cws-keys].
1. `WEB_EXT_API_KEY`, and `WEB_EXT_API_SECRET` from [AMO][link-amo-keys].

And then running:

``` sh
npm run release
```

This will:

1. Build the extension
1. Create a version number based on the current UTC time, like [`19.6.16.428`](https://github.com/fregante/daily-version) and sets it in the manifest.json
1. Deploy it to both stores

#### Auto-publishing

Thanks to the included [GitHub Action Workflows](.github/workflows), if you set up those ENVs in the repo's Settings, the deployment will automatically happen:

- when creating a `deploy` tag (it will use the current date/time as version, like [`19.6.16.428`](hhttps://github.com/fregante/daily-version))
- when creating a specific version tag based on the same date format (like `20.1.2` or `20.1.2.3`)
- on a schedule, by default [every week](.github/workflows/deploy-automatic.yml) (but only if there are any new commits in the last tag)

## License

[MIT](https://github.com/cmnord/jeparser/blob/main/LICENSE) (c) [cmnord](https://github.com/cmnord/)