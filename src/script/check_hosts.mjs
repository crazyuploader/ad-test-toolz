// Tests each host in src/data/adblock_data.json. The script has two modes.
//
// Live mode is the default. It finds hosts that are dead. The script gets the
// address of each host from a public DoH resolver (DNS over HTTPS). A local
// ad blocker cannot change that answer. Then the script sends an HTTPS
// request to that address, with full certificate checks. The web test counts
// each failed request as "blocked". Thus a dead host, or a host with a bad
// certificate, gives a false pass in the web test.
//
// Blocking mode starts with --doh <url>. It sends each host to that DoH
// resolver, for example your AdGuard Home server. A host is blocked when the
// answer is NXDOMAIN, REFUSED, empty, or a sinkhole address (0.0.0.0).
//
// Usage:
//   node src/script/check_hosts.mjs
//   node src/script/check_hosts.mjs --doh https://dns.example.com/dns-query
//   node src/script/check_hosts.mjs --category OEMs --json
import https from 'node:https'
import { readFile } from 'node:fs/promises'
import { styleText, parseArgs } from 'node:util'

const DATA = new URL('../data/adblock_data.json', import.meta.url)
const PUBLIC_DOH = [
	'https://cloudflare-dns.com/dns-query',
	'https://dns.google/dns-query'
]
const SINKHOLES = new Set(['0.0.0.0', '127.0.0.1', '::', '::1'])
const RCODES = { 0: 'NOERROR', 2: 'SERVFAIL', 3: 'NXDOMAIN', 5: 'REFUSED' }

const { values: args } = parseArgs({
	options: {
		doh: { type: 'string' },
		category: { type: 'string' },
		concurrency: { type: 'string', default: '16' },
		timeout: { type: 'string', default: '10000' },
		json: { type: 'boolean', default: false }
	}
})
const TIMEOUT = Number(args.timeout)

// --- DNS over HTTPS (RFC 8484, wire format) -------------------------------

function encodeQuery(name, type) {
	const labels = name.split('.').filter(Boolean)
	const qname = Buffer.concat([
		...labels.map((l) =>
			Buffer.concat([Buffer.from([l.length]), Buffer.from(l, 'ascii')])
		),
		Buffer.from([0])
	])
	// Header: ID 0, recursion desired, 1 question.
	const header = Buffer.from([0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0])
	const tail = Buffer.alloc(4)
	tail.writeUInt16BE(type, 0)
	tail.writeUInt16BE(1, 2) // class IN
	return Buffer.concat([header, qname, tail])
}

function skipName(buf, off) {
	while (off < buf.length) {
		const len = buf[off]
		if (len === 0) return off + 1
		if ((len & 0xc0) === 0xc0) return off + 2 // Pointer to a name earlier in the message
		off += len + 1
	}
	throw new Error('bad DNS name')
}

function decodeResponse(buf) {
	const rcode = buf[3] & 0x0f
	const qd = buf.readUInt16BE(4)
	const an = buf.readUInt16BE(6)
	let off = 12
	for (let i = 0; i < qd; i++) off = skipName(buf, off) + 4
	const addresses = []
	for (let i = 0; i < an; i++) {
		off = skipName(buf, off)
		const type = buf.readUInt16BE(off)
		const rdlen = buf.readUInt16BE(off + 8)
		const rdata = buf.subarray(off + 10, off + 10 + rdlen)
		if (type === 1 && rdlen === 4) addresses.push([...rdata].join('.'))
		if (type === 28 && rdlen === 16) {
			const parts = []
			for (let j = 0; j < 16; j += 2)
				parts.push(rdata.readUInt16BE(j).toString(16))
			addresses.push(
				parts
					.join(':')
					.replace(/(^|:)0(:0)+(:|$)/, '::')
					.replace(/:{3,}/, '::')
			)
		}
		off += 10 + rdlen
	}
	return { rcode: RCODES[rcode] ?? `RCODE${rcode}`, addresses }
}

async function doh(endpoint, name, type = 1) {
	const res = await fetch(endpoint, {
		method: 'POST',
		headers: {
			'content-type': 'application/dns-message',
			accept: 'application/dns-message'
		},
		body: encodeQuery(name, type),
		signal: AbortSignal.timeout(TIMEOUT)
	})
	if (!res.ok) throw new Error(`DoH HTTP ${res.status}`)
	return decodeResponse(Buffer.from(await res.arrayBuffer()))
}

async function resolvePublic(name) {
	let lastErr
	for (const endpoint of PUBLIC_DOH) {
		try {
			return await doh(endpoint, name)
		} catch (err) {
			lastErr = err
		}
	}
	throw lastErr
}

// --- HTTPS request to the address from the DoH answer ----------------------------------

function httpsProbe(host, ip) {
	return new Promise((resolve) => {
		const req = https.request(
			{
				host,
				servername: host,
				path: '/fakepage.html',
				method: 'HEAD',
				timeout: TIMEOUT,
				headers: { 'user-agent': 'toolz-host-check' },
				lookup: (_h, opts, cb) =>
					opts && opts.all
						? cb(null, [{ address: ip, family: 4 }])
						: cb(null, ip, 4)
			},
			(res) => {
				res.resume()
				resolve({ ok: true, detail: `HTTP ${res.statusCode}` })
			}
		)
		req.on('timeout', () => req.destroy(new Error('timeout')))
		req.on('error', (err) =>
			resolve({ ok: false, detail: err.code || err.message })
		)
		req.end()
	})
}

async function checkLive(host) {
	let dns
	try {
		dns = await resolvePublic(host)
	} catch (err) {
		return { host, ok: false, detail: `DoH error: ${err.message}` }
	}
	const v4 = dns.addresses.filter((a) => a.includes('.'))
	if (dns.rcode !== 'NOERROR' || v4.length === 0)
		return { host, ok: false, detail: `DNS ${dns.rcode}, no A record` }
	if (v4.every((a) => SINKHOLES.has(a)))
		return { host, ok: false, detail: 'DNS returns a sinkhole address' }
	const ip = v4.find((a) => !SINKHOLES.has(a))
	// Send the request again one time. Then one slow handshake does not mark
	// the host as dead.
	let probe = await httpsProbe(host, ip)
	if (!probe.ok) probe = await httpsProbe(host, ip)
	return { host, ok: probe.ok, detail: `${ip} ${probe.detail}` }
}

async function checkBlocked(host, endpoint) {
	try {
		const dns = await doh(endpoint, host)
		const blocked =
			dns.rcode === 'NXDOMAIN' ||
			dns.rcode === 'REFUSED' ||
			(dns.rcode === 'NOERROR' &&
				(dns.addresses.length === 0 ||
					dns.addresses.every((a) => SINKHOLES.has(a))))
		const detail = dns.addresses.length
			? `${dns.rcode} ${dns.addresses.join(',')}`
			: dns.rcode
		return { host, ok: blocked, detail }
	} catch (err) {
		return { host, ok: false, detail: `DoH error: ${err.message}` }
	}
}

// --- main -----------------------------------------------------------------

async function pool(items, limit, fn) {
	const out = new Array(items.length)
	let next = 0
	const workers = Array.from({ length: limit }, async () => {
		while (next < items.length) {
			const i = next++
			out[i] = await fn(items[i])
		}
	})
	await Promise.all(workers)
	return out
}

const data = JSON.parse(await readFile(DATA, 'utf8'))
const entries = []
for (const [category, groups] of Object.entries(data)) {
	if (args.category && category !== args.category) continue
	for (const [group, hosts] of Object.entries(groups))
		for (const host of hosts) entries.push({ category, group, host })
}

const mode = args.doh ? 'blocked' : 'live'
const results = await pool(entries, Number(args.concurrency), async (e) => ({
	...e,
	...(mode === 'blocked'
		? await checkBlocked(e.host, args.doh)
		: await checkLive(e.host))
}))

const failed = results.filter((r) => !r.ok)
if (args.json) {
	console.log(JSON.stringify({ mode, results }, null, '\t'))
} else {
	const okLabel = mode === 'live' ? 'live' : 'blocked'
	const badLabel = mode === 'live' ? 'dead' : 'NOT blocked'
	for (const r of results) {
		const tag = r.ok
			? styleText('green', okLabel.padEnd(11))
			: styleText('red', badLabel.padEnd(11))
		console.log(
			`${tag} ${r.category} / ${r.group}  ${r.host}  ${styleText('dim', r.detail)}`
		)
	}
	console.log(
		`\n${results.length - failed.length}/${results.length} ${okLabel}` +
			(failed.length ? `, ${failed.length} ${badLabel}` : '')
	)
}
process.exitCode = failed.length ? 1 : 0
