/** @type {import('eslint').Linter.Config} */
module.exports = {
	extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
	env: {
		node: true,
	},
	// ignore the dist folder
	ignorePatterns: ["dist", "*.config.js"],
};
