# Changelog

## [2.3.0](https://github.com/cmnord/jeparser/compare/v2.2.0...v2.3.0) (2023-04-10)


### Features

* **src content-script:** add category notes ([709468d](https://github.com/cmnord/jeparser/commit/709468de420fe902080917c2ec8b27656e6f54bb))
* **src content-script:** remove `\` escape from single quotes ([e1ddfe7](https://github.com/cmnord/jeparser/commit/e1ddfe7c962c88141f5a954f382ef24996f9b0ca))

## [2.2.0](https://github.com/cmnord/jeparser/compare/v2.1.0...v2.2.0) (2023-03-24)


### Features

* **src content-script:** get expected clue value for DD, unreveal ([46298c5](https://github.com/cmnord/jeparser/commit/46298c5b8cc860a0b0fdf501e334a60f4afcafbe))
* **src content-script:** mark final clues as long-form ([841b7f8](https://github.com/cmnord/jeparser/commit/841b7f89cc6169efea84cf05cce47aeac412f2ac))

## [2.1.0](https://github.com/cmnord/jeparser/compare/v2.0.0...v2.1.0) (2023-03-18)


### Features

* **src content-script:** optional `wagerable` property on clue ([f686e0e](https://github.com/cmnord/jeparser/commit/f686e0ec1242fd8cf1fc4cd9fbe841892d8ae5a4))


### Bug Fixes

* **src content-script:** make note optional ([381cb43](https://github.com/cmnord/jeparser/commit/381cb43b417a58f01496a5a962174c9583709a7e))
* **src content-script:** remove HTML tags from all answers ([4bf5687](https://github.com/cmnord/jeparser/commit/4bf5687008aac5d91183e14ecda0966eb20c4dbb))

## [2.0.0](https://github.com/cmnord/jeparser/compare/v1.1.0...v2.0.0) (2023-03-07)


### ⚠ BREAKING CHANGES

* **src manifest:** change AMO extension ID

### Bug Fixes

* **gitignore:** ignore .DS_Store ([2e044e8](https://github.com/cmnord/jeparser/commit/2e044e8d2932621295ff0bfe14e5a508e5ca0cfe))


### Build System

* **src manifest:** change AMO extension ID ([ebf2d07](https://github.com/cmnord/jeparser/commit/ebf2d07ab856b9becfd141b7f3481f61fdd21e38))

## [1.1.0](https://github.com/cmnord/jeparser/compare/v1.0.0...v1.1.0) (2023-03-07)


### Features

* **src content-script:** remove HTML tags from answers ([20ce7ad](https://github.com/cmnord/jeparser/commit/20ce7adaf00278cd76cb1ffa9b62fe39fe9305d0))

## [1.0.0](https://github.com/cmnord/jeparser/compare/v0.0.1...v1.0.0) (2023-02-28)


### ⚠ BREAKING CHANGES

* **package.json:** remove lint and test commands
* get typescript working according to readme
* **package.json:** upgrade with breaking changes

### Features

* **.github workflows release:** use release-please ([0652557](https://github.com/cmnord/jeparser/commit/0652557306f0bddfe0b4f438b8f11dff44fc3546))
* **.github workflows:** update manifest.json version in action ([35a4b3b](https://github.com/cmnord/jeparser/commit/35a4b3b64a7747cff62d26740a25ec9e8b9a63c5))
* get typescript working according to readme ([1c8fe52](https://github.com/cmnord/jeparser/commit/1c8fe528770370471c26ae1dc7a5339eb85dc35e))
* **package.json:** alphabetize scripts, rename watch to dev ([844bded](https://github.com/cmnord/jeparser/commit/844bded22ee73417835946ca9079508eeb60bac9))
* **package.json:** remove lint and test commands ([ed2fc95](https://github.com/cmnord/jeparser/commit/ed2fc95e302b226ec5182aedbc2d4c9a7f6814f2))
* **source content:** add popup content, remove browse polyfill ([9dabdee](https://github.com/cmnord/jeparser/commit/9dabdee1f638322f360cdadf94618aaca37378e2))
* **source:** add browser polyfill back in ([f7c857f](https://github.com/cmnord/jeparser/commit/f7c857f0a8402302297272f0e61f2966fab3ebce))
* **source:** lay out basics of content script and popup script ([beddfcd](https://github.com/cmnord/jeparser/commit/beddfcda39a92286d24e27a58f0f59163a71b19d))
* **src content-script:** parse correct responses for clues ([9c09bf5](https://github.com/cmnord/jeparser/commit/9c09bf5cb997466a2194c6ea599d92a57b824000))
* **src content-script:** parse correct responses for clues ([dc6e40a](https://github.com/cmnord/jeparser/commit/dc6e40a63e7bcf395d3187e5f2f2e4e31a3a995e))
* **src popup:** apply some basic styles ([5a50aeb](https://github.com/cmnord/jeparser/commit/5a50aeb28b2268578e22720711f84a2b62414ebf))
* **src:** move all files to src, start parsing out board w/ vanilla JS ([4963025](https://github.com/cmnord/jeparser/commit/496302537b3064290a75d85b1ffdaafec82f5022))


### Bug Fixes

* **package.json:** upgrade a bunch of dependencies ([29271c2](https://github.com/cmnord/jeparser/commit/29271c2d1901b7820fe745377f6a3a1e25d24525))
* **source popup:** simplify popup ([89c8553](https://github.com/cmnord/jeparser/commit/89c855353bce536277fa307b3f3ee1f1fd454783))
* **src content-script:** coerce clue values to 0 instead of null ([581092f](https://github.com/cmnord/jeparser/commit/581092f2e531f78fa57ee1e6ff8a775684ea73c7))
* **src content-script:** remove category from clue json ([7d22305](https://github.com/cmnord/jeparser/commit/7d22305a82baa0c5725f1dfd2635ecba688f0c4d))
* **src content-script:** remove order ([7dc2476](https://github.com/cmnord/jeparser/commit/7dc2476c033d3aa2acde0e055d45386bd3cc94e3))
* **src content-script:** rm logs, soup -&gt; parser/divs ([f2c8a8a](https://github.com/cmnord/jeparser/commit/f2c8a8ad4136e309e64b68ee0403f393a8d492dc))
* **src manifest:** add description to manifest ([2557d3d](https://github.com/cmnord/jeparser/commit/2557d3daa1cc19d40de866a7bcecdad38e36c687))
* **src popup popup:** better handle errors on non-permissioned pages ([f272502](https://github.com/cmnord/jeparser/commit/f2725026fff54c28b5605ddeb4afbdd3cd099075))


### Miscellaneous Chores

* **package.json:** upgrade with breaking changes ([5c2edc5](https://github.com/cmnord/jeparser/commit/5c2edc5d674a1047070081cb5dd7638da9679fe7))

## Changelog

TODO: fill in changelog
