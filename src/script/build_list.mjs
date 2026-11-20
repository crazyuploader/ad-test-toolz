// Writes src/d3host.txt (hosts format) and src/d3host.adblock (adblock
// format) from src/data/adblock_data.json. To find dead hosts in the list,
// run `pnpm check-hosts`.
import { readFile, writeFile } from 'node:fs/promises'

const DATA = new URL('../data/adblock_data.json', import.meta.url)

function center(s, max, c) {
	return s
		.padStart(s.length + Math.floor((max - s.length) / 2), c)
		.padEnd(max, c)
}

function header(entries, date, comment) {
	const ext = comment === '#' ? '.txt' : '.adblock'
	return [
		' Title: d3Host List by d3ward',
		' Expires: 1 days',
		' Description: Simple and small list with the most popular advertising, tracking, analytics and social advertising services',
		' Homepage: https://github.com/crazyuploader/ad-test-toolz',
		' License: CC BY-NC-SA',
		' Source: https://github.com/crazyuploader/ad-test-toolz/blob/main/src/d3host' +
			ext,
		'',
		' This list cover all the tests on https://d3ward.github.io/toolz/adblock',
		' Type : Stable',
		' Entries : ' + entries,
		' Updated On: ' + date,
		' Created by: d3ward'
	]
		.map((l) => (l === '' ? '' : comment + l))
		.join('\n')
}

function build(obj, comment, pre, post) {
	let txt = ''
	let entries = 0
	for (const [category, groups] of Object.entries(obj)) {
		txt += '\n\n' + comment + center(' ' + category + ' ', 30, '=') + '\n'
		for (const [group, hosts] of Object.entries(groups)) {
			txt += '\n' + comment + ' --- ' + group + '\n'
			for (const host of hosts) {
				entries++
				txt += pre + host + post + '\n'
			}
		}
	}
	if (pre === '||')
		txt +=
			'\n*$3p,domain=d3ward.github.io\n/pagead.js$domain=d3ward.github.io\n@@*$redirect-rule,domain=d3ward.github.io\nd3ward.github.io##.textads'
	const now = new Date()
	const date = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`
	return header(entries, date, comment) + txt
}

const data = JSON.parse(await readFile(DATA, 'utf8'))
const outputs = [
	[
		new URL('../d3host.txt', import.meta.url),
		build(data, '#', '0.0.0.0 ', '')
	],
	[new URL('../d3host.adblock', import.meta.url), build(data, '!', '||', '^')]
]
for (const [file, content] of outputs) {
	await writeFile(file, content, 'utf8')
	console.log('Created ' + file.pathname)
}
