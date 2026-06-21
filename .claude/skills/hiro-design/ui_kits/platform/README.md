# Hiro Platform — UI Kit

A high-fidelity recreation of the [Hiro Platform](https://platform.hiro.so/) — Hiro's browser-based web3 development environment for writing, checking and deploying Clarity smart contracts.

> ⚠️ The Platform sits behind a login, so this kit is an **interpretation** built from the public product description ("write and deploy smart contracts from your browser") and Hiro's brand language, not a pixel trace of the live app. Treat layout specifics as approximate.

## Flow / screens
- **PlatformTopBar** — dark app bar: H logo + `platform / <project>` breadcrumb, a `Devnet / Testnet / Mainnet` network switcher, and an account avatar.
- **PlatformProjects** — projects dashboard: a `New project` action and a grid of project cards with network badges and metadata. Click a card to open it.
- **PlatformSidebar** — file explorer (`contracts/`, `tests/`, `Clarinet.toml`) with the active file highlighted in violet.
- **PlatformEditor** — Clarity code editor with file tabs, line numbers, lightweight syntax tint, `Check` / `Deploy` actions, and a live **console** that logs `clarinet check` / deploy output. The console status badge follows the selected network.

## How it's built
`index.html` loads React + Babel + the compiled `_ds_bundle.js`, then the section `.jsx` files. It composes DS primitives (`Button`, `Badge`, `Avatar`) and the brand `Terminal`/console treatment. Interactive: open a project, switch networks, run Check/Deploy and watch the console.
