import { PurgeCSS } from 'purgecss'
import path from 'path'
import config from './config.js' // Make sure the config file is also compatible with ESM
import fs from 'fs'
import { styleText } from 'node:util'

const print = (text) => process.stdout.write(`${text}\n`)

const pages = config.pages
const options = pages.map((page) => {
	const css = path.join(config.build, `css/${page}.css`)
	const content = [
		path.join(config.build, config.html(page)),
		path.join(config.build, `js/${page}.js`)
	]
	return {
		css: [css],
		content: content
	}
})

Promise.all(options.map((option) => new PurgeCSS().purge(option))).then(
	(results) => {
		results.forEach((result, i) => {
			const css = result[0].css
			const cssFile = path.join(config.build, `css/${pages[i]}.css`)
			print(styleText('green', `File: ${cssFile}`))
			print(
				`Original size: ${(
					fs.statSync(path.join(config.build, `css/${pages[i]}.css`))
						.size / 1024
				).toFixed(2)}KB`
			)
			print(`Optimized size: ${(css.length / 1024).toFixed(2)}KB`)
			fs.writeFileSync(cssFile, css)
		})
	}
)
