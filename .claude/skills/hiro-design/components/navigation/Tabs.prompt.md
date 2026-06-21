Monospace, uppercase tab bar with a violet underline on the active tab.

```jsx
<Tabs
  defaultValue="bento"
  tabs={[{id:'bento',label:'Bento'},{id:'tree',label:'Tree'},{id:'featured',label:'Featured'}]}
  onChange={setView}
/>
```

Each tab: `{ id, label, count? }`. Controlled via `value` or uncontrolled via `defaultValue`.
