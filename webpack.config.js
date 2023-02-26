const path = require("path");
const SizePlugin = require("size-plugin");
const CopyPlugin = require("copy-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");

module.exports = {
	devtool: "source-map",
	stats: "errors-only",
	entry: {
		background: "./source/background",
		options: "./source/options",
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
		path: path.resolve(__dirname, "distribution"),
		filename: "[name].js",
	},
	resolve: {
		extensions: [".ts", ".tsx", ".js"],
	},
	plugins: [
		new SizePlugin(),
		new CopyPlugin({
			patterns: [
				{
					from: "**/*",
					context: "source",
					globOptions: {
						ignore: ["**/*.js"],
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
