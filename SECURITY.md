# Dependency Security Notes

Last reviewed: 2026-08-08

This project is a Create React App (`react-scripts` 5.0.1) build, so most Dependabot
alerts land on transitive packages we do not depend on directly. They are pinned to
patched versions through the `overrides` block in `package.json`.

Running `npm audit` should report **12 findings (6 low, 2 moderate, 4 high, 0 critical)**.
Everything reported beyond the accepted items below is a regression and should be fixed.

## Why `overrides` is used

`react-scripts` pins many of its dependencies tightly and is no longer actively released,
so the vulnerable packages cannot be updated by bumping a direct dependency. The
`overrides` block forces patched versions into the tree instead.

Some packages appear in the tree at two major versions at once. Those use nested
overrides so each copy moves to the fix for *its* major line, rather than forcing one
major onto a consumer that cannot accept it:

| Package | Root copy | Scoped copy |
| --- | --- | --- |
| `js-yaml` | `^3.15.1` | `^4.3.1` under `eslint` / `@eslint/eslintrc` |
| `yaml` | `^1.10.3` | `^2.9.0` under `postcss-load-config` |
| `ws` | `^7.5.13` | `^8.21.3` under `webpack-dev-server` |
| `svgo` | left at 1.3.2 (see below) | `^2.8.3` under `postcss-svgo` |

## Accepted findings

These have no fix that is compatible with `react-scripts` 5. They were reviewed and
deliberately left in place.

### webpack-dev-server 4.15.2 — 6 advisories, moderate

Source-code exposure via malicious sites, HMR WebSocket interception, CSRF on internal
dev endpoints, and a malformed `Host`/`Origin` DoS.

The first patched release is **6.0.0**; every 4.x and 5.x version is affected.
`react-scripts` 5 drives the dev server through `onBeforeSetupMiddleware` /
`onAfterSetupMiddleware`, which were removed in webpack-dev-server 5, so forcing 6.0.0
breaks `npm start` outright.

**Exposure:** development only. The dev server is never part of `npm run build` output
and is not deployed. The realistic attack requires a developer to visit a hostile page
while the dev server is running. Do not run `npm start` on an untrusted network or bind
it to a public interface.

### svgo 1.3.2 — 2 advisories, high

Billion-laughs entity expansion, and `removeScripts` leaving some executable scripts intact.

Reached only via `@svgr/webpack` 5.5.0 → `@svgr/plugin-svgo` 5.5.0, which is pinned by
`react-scripts` 5. svgo 1.x received no fix — the patch is in 2.8.3, and svgo 2.x replaced
the `SVGO` class with a different `optimize()` API that `@svgr/plugin-svgo` 5 cannot call.
Upgrading requires `@svgr/webpack` 8, which `react-scripts` does not support.

The second copy of svgo, under `postcss-svgo`, **is** patched to 2.8.3 via a nested override.

**Exposure:** build time only, and only for SVGs imported from `src/`. All SVG assets here
are first-party and committed to the repo; no untrusted SVG is ever fed to the build.

### elliptic 6.6.1 / secp256k1 3.8.1 — 4 low findings

"Uses a Cryptographic Primitive with a Risky Implementation." Reached through
`@hiveio/dhive` and through `crypto-browserify` → `browserify-sign` / `create-ecdh`.

**No patched version exists.** 6.6.1 is the latest `elliptic` release and is still flagged.
`npm audit` suggests "fixing" this by downgrading `crypto-browserify` to 3.3.0, which is
older and worse, so that suggestion is ignored.

**Exposure:** unlike the two above, this code **does ship to the browser** and is used for
Hive transaction signing. It is worth re-checking whenever `@hiveio/dhive` publishes an
update. The advisory is rated low and concerns side-channel resistance rather than a
directly exploitable flaw.

### react-scripts / @craco/craco

These two are reported only as parents of the webpack-dev-server and svgo findings above.
They clear once those clear.

## Related build configuration

Upgrading `react-router-dom` to v7 required two changes that are easy to mistake for
unrelated cruft — leave them in place:

- `craco.config.js` aliases `process/browser` to an explicit `process/browser.js` and sets
  `resolve.fullySpecified: false` for `.js`/`.mjs`. react-router v7 is strict ESM, and
  webpack will not resolve the extensionless request injected by `ProvidePlugin` from
  inside it.
- `craco.config.js` maps `react-router/dom` for Jest, and `src/setupTests.js` polyfills
  `TextEncoder` / `TextDecoder`. Jest 27 and its jsdom 16 predate `exports` maps and those
  globals, and react-router v7 needs both.

## Re-checking

```bash
npm audit                 # expect 12 findings, 0 critical
npm run build             # must compile
npm start                 # dev server must serve on :3000
```
