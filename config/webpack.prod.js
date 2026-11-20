const main = require('./webpack.main')
const { merge } = require('webpack-merge')
const TerserPlugin = require('terser-webpack-plugin')

module.exports = merge(main, {
	mode: 'production',
	optimization: {
		minimize: true,
		minimizer: [
			new TerserPlugin({
				test: /\.js(\?.*)?$/i
			})
		]
	},
	output: {
		clean: true
	}
})
