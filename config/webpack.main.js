const HTMLWebpackPlugin = require('html-webpack-plugin')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const config = require('./config')
const pages = config.pages

module.exports = {
	context: config.src,
	entry: {
		...pages.reduce((acc, page) => {
			acc[page] = `./js/${page}.js`
			return acc
		}, {})
	},
	output: {
		filename: 'js/[name].js',
		path: config.build,
		clean: false,
		assetModuleFilename: '[path][name][ext]',
		publicPath: '/'
	},
	plugins: [
		new CopyWebpackPlugin({
			patterns: [
				{
					from: './assets',
					to: 'assets',
					globOptions: {
						ignore: [
							'*.DS_Store',
							'**/css/*.css',
							'**/js/*.js',
							'**/*.html'
						]
					},
					noErrorOnMissing: true
				},
				// Cloudflare Pages redirects. Old links to /adblock go to /.
				{ from: './_redirects', to: '.' }
			]
		}),
		new MiniCssExtractPlugin({
			filename: 'css/[name].css',
			chunkFilename: '[name].css'
		}),
		...pages.map(
			(page) =>
				new HTMLWebpackPlugin({
					template: `./${page}.ejs`,
					filename: config.html(page),
					chunks: [page],
					minify: false,
					sources: false
				})
		)
	],
	module: {
		rules: [
			{
				test: /\.(png|svg|jpg|jpeg|gif)$/i,
				type: 'asset/resource'
			},
			{
				test: /\.ejs$/i,
				use: ['html-loader', 'template-ejs-loader']
			},
			{
				test: /\.(sa|sc|c)ss$/,
				use: [
					MiniCssExtractPlugin.loader, // Extract CSS from commonjs
					'css-loader', // Turn css into commonjs
					'sass-loader' // Turn scss into css
				]
			}
		]
	}
}
