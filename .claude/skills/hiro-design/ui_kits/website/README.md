# Hiro Marketing Website — UI Kit

A high-fidelity recreation of [hiro.so](https://www.hiro.so/), Hiro's developer-tools marketing site.

## Screens / sections
- **SiteNav** — sticky nav with a dark announcement bar, H-mark logo, mono dropdown items, Docs/Sign-in links and a `Start building` button.
- **SiteHero** — `/ Developer tools for Bitcoin layers` eyebrow, the giant uppercase `BUILD WEB3 ON BITCOIN.` headline (violet "Bitcoin."), lead copy, primary + secondary CTAs, and a live `Terminal` quickstart panel.
- **ProductExplorer** — `View :` switcher (**Bento / Tree / Featured**) over the product set. Bento = card grid; Tree = the `$ tree path/hiro` file-tree; Featured = two large product cards. This mirrors the real site's view toggle.
- **SiteUpdates** — "Latest posts & videos" list with mono dates and `/ Kind` tags.
- **SiteFooter** — dark footer with the bracketed `[ Subscribe ]` newsletter, tree-style link columns (`├──` / `└──`), copyright and an "All systems normal" status badge.

## How it's built
`index.html` loads React + Babel + the compiled `_ds_bundle.js`, then the section `.jsx` files. Sections compose DS primitives (`Button`, `Card`, `Tabs`, `Terminal`, `TreeView`, `Badge`, `BracketButton`, `Tag`) — they are **not** re-implemented here. Each section assigns itself to `window` for cross-file scope.

> Interactive: switch Bento/Tree/Featured, hover cards and posts, toggle the newsletter consent.
