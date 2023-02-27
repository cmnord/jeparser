const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");

module.exports = {
	devtool: "source-map",
	stats: "errors-only",
	entry: {
		"content-script": "./src/content-script",
		"popup/popup": "./src/popup/popup",
	},
	module: {
		rules: [
			{
				test: /\.(js|ts|tsx)$/,
				use: "ts-loader",
				exclude: /node_modules/,
			},
		],
	},
	output: {
		path: path.resolve(__dirname, "dist"),
		filename: "[name].js",
	},
	resolve: {
		extensions: [".ts", ".tsx", ".js"],
		modules: ["./src", "./node_modules"],
	},
	plugins: [
		new CopyPlugin({
			patterns: [
				{
					context: "src",
					from: "**/*",
					globOptions: {
						ignore: ["**/*.js", "**/*.ts", "**/*.tsx"],
					},
				},
				{
					from: "node_modules/webextension-polyfill/dist/browser-polyfill.min.js",
					to: "browser-polyfill.min.js",
				},
			],
		}),
	],
	optimization: {
		minimizer: [
			new TerserPlugin({
				terserOptions: {
					mangle: false,
					compress: false,
					output: {
						beautify: true,
						indent_level: 2, // eslint-disable-line camelcase
					},
				},
			}),
		],
	},
};
