Dark CLI / code panel with traffic-light chrome — Hiro's signature brand motif. Use for hero code, install steps, command output.

```jsx
<Terminal title="bash" lines={[
  { text: 'npm install @hirosystems/clarinet', prompt: true },
  { text: 'clarinet contract new counter', prompt: true, comment: 'scaffold a Clarity contract', tone: 'accent' },
  { text: 'Created contracts/counter.clar', tone: 'green' },
]} />
```

Each line: `{ text, comment?, prompt?, tone? }` where tone ∈ `default · muted · accent · orange · green`. Or pass freeform `children`.
