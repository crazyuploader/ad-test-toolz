const path = require('path')
module.exports = {
	src: path.resolve(__dirname, '../src'),
	build: path.resolve(__dirname, '../dist'),
	public: path.resolve(__dirname, '../src'),
	pages: ['index', 'fontlist', 'units', 'adblock', '404'],
	// The adblock test is the home page. The page with the list of tools
	// moves to /tools.
	html: (page) =>
		({ adblock: 'index.html', index: 'tools.html' })[page] ?? `${page}.html`
}
