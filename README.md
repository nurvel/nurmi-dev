# nurmi.dev

My [personal website](https://nurvel.github.io) hosted on GitHub Pages, built with React + Vite.

## Get started 

Run locally with `npm start` (alias for `vite`) and open the URL printed in the terminal.

### Production preview

Use this single command:

```
npm run preview
```

An npm lifecycle hook (`prepreview`) runs `npm run build` first, so the preview server **always** serves a fresh build. This is the guaranteed way to preview production output from the current source.

**Do not background builds** — running `npm run build & npm run preview` is racy: the
preview server may start before the build finishes and serve stale bytes from `dist/`, or
the filesystem write may still be in flight, leading to byte-level mismatches between the
served output and the source code. Use only the sequential `npm run preview` command above.

The project includes a deterministic parity check:

```
npm run preview:check
```

It rebuilds from scratch, starts the preview server on a fixed loopback port, fetches the
served HTML and its JS module asset through localhost, and verifies that every byte matches
the just-built `dist/` files. It cleans up after itself and exits 0 on success.

### Artifact ownership

`dist/` is a **generated artifact**. It lives in `.gitignore` and is regenerated on demand
by `npm run build`. It is never committed to the repository. To deploy, use `npm run deploy`
(which runs `predeploy: npm run build` before publishing via `gh-pages`).
