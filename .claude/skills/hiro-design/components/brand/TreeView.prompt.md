ASCII `$ tree` file-tree — Hiro uses this to lay out its product/feature map with `├──` `└──` connectors and `# comments`.

```jsx
<TreeView root="path/hiro" nodes={[
  { label: 'stacks', children: [
    { label: 'hiro-platform', comment: 'write & deploy contracts', accent: true, onClick: go },
    { label: 'chainhook', comment: 'react to onchain events' },
    { label: 'stacks-api', comment: 'query the blockchain' },
  ]},
]} />
```

Each node: `{ label, comment?, accent?, children?, onClick? }`.
