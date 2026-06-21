Primary action button in the Hiro style — square-ish corners, Space Grotesk medium, optional mono arrow.

```jsx
<Button variant="primary" arrow onClick={start}>Start coding</Button>
<Button variant="accent">Deploy contract</Button>
<Button variant="secondary" size="sm">View docs</Button>
```

Variants: `primary` (ink fill), `accent` (violet fill), `secondary` (outline), `ghost`. Sizes `sm | md | lg`. Set `arrow` for the trailing "→", `fullWidth` to stretch.
