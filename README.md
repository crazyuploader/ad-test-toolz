# Toolz

<p align="center">
 <img src="src/assets/toolz/icon.svg" alt="Toolz"
	title="b2ntp" width="160" height="160" />
</p>
A set of testing and verification tools, with simple and beautiful design.

This repository is a maintained fork of [d3ward/toolz](https://github.com/d3ward/toolz). The original repository is archived.

## Ad Block Test [Link](https://ad-test-toolz.pages.dev/adblock)

This tool checks how many hosts your ad blocker blocks. The page tries to connect to common hosts in 7 categories: Ads, Mobile Ads, Analytics, Mobile Apps, Social Trackers, Telemetry, and OEMs (phone makers such as Xiaomi, Samsung, and Oppo). An optional group of India Apps is off by default. You can turn it on in the settings.

If you want to block all the hosts in the test, use one of these lists:

- Hosts format: [d3host.txt](src/d3host.txt)
- Adblock format: [d3host.adblock](src/d3host.adblock)

The d3Host list is also included in

- [Blokada](https://blokada.org/)
- [OISD List](https://oisd.nl/)

## Units Test of Viewport [Link](https://ad-test-toolz.pages.dev/units)

This tool is useful for testing different units for expressing a length in CSS.
One of them is the 'vh', where 100vh should be 100%, but on mobile browsers it isn't. Over the years, there has been a lot of talk about this problem on mobile browsers, mainly on Safari which uses WebKit, but Chromium browsers are affected as well. In addition to the test, there are in-depth studies and solutions available.

## Fontlist [Link](https://ad-test-toolz.pages.dev/fontlist)

This tool allows you to check the list of web safe fonts supported by your browser. These are the fonts that are installed by default on virtually every computer or mobile device. This is what makes them "safe". No matter where you are in the world or what device you are using, a web safe font will always load and display correctly.

## Development

You need Node.js 22 or later and pnpm. The `packageManager` field in `package.json` sets the pnpm version.

```sh
pnpm install
pnpm dev          # Start the dev server on http://localhost:3000
pnpm build        # Build the site into dist/
pnpm build-list   # Write src/d3host.txt and src/d3host.adblock from src/data/adblock_data.json
pnpm lint
```

The hosts are in `src/data/adblock_data.json`. To find hosts that are dead, run:

```sh
pnpm check-hosts
```

The script gets the address of each host from a public DoH resolver (DNS over HTTPS), then sends an HTTPS request to it. A local ad blocker cannot change the result. To see which hosts your own resolver blocks, give its DoH address:

```sh
pnpm check-hosts --doh https://dns.example.com/dns-query
```

A GitHub workflow runs `pnpm check-hosts` every Monday and on each pull request that changes the hosts.

## Contributing

If you have any problems with any of the tools, feel free to share them by opening an issue.
You can also suggest a new test tool to be created or added. Contributions are welcome and encouraged.

## License

Toolz is licensed under [(CC BY-NC-SA 4.0)](https://creativecommons.org/licenses/by-nc-sa/4.0/)
