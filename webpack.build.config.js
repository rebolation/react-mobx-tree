module.exports = {
	entry: {
		javascript: "./src/index.js"
	},
	output: {
		filename: "react-mobx-tree.js",
		path: __dirname + "/dist"
	},
	mode: "development",
	module: {
		rules: [
			{ test: /\.js$/, exclude: /node_modules/, loader: "babel-loader" },
			{ test: /\.css$/, use: ['style-loader', 'css-loader'] },
			{ test: /\.scss$/, use: [ "style-loader", "css-loader", "sass-loader" ] },
			{ test: /\.(ttf|eot|svg|woff(2)?)(\?[a-z0-9]+)?$/, loader: 'file-loader' }
		]	
	},
	externals: {
		"react": "React",
		"react-dom": "ReactDOM"
	},
};
