/* @ds-bundle: {"format":3,"namespace":"HiroDesignSystem_318aec","components":[{"name":"BracketButton","sourcePath":"components/actions/BracketButton.jsx"},{"name":"Button","sourcePath":"components/actions/Button.jsx"},{"name":"Terminal","sourcePath":"components/brand/Terminal.jsx"},{"name":"TreeView","sourcePath":"components/brand/TreeView.jsx"},{"name":"Avatar","sourcePath":"components/display/Avatar.jsx"},{"name":"Badge","sourcePath":"components/display/Badge.jsx"},{"name":"Card","sourcePath":"components/display/Card.jsx"},{"name":"Tag","sourcePath":"components/display/Tag.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Toggle","sourcePath":"components/forms/Toggle.jsx"},{"name":"Tabs","sourcePath":"components/navigation/Tabs.jsx"}],"sourceHashes":{"components/actions/BracketButton.jsx":"ba19458787c3","components/actions/Button.jsx":"ea456868e454","components/brand/Terminal.jsx":"53515a808845","components/brand/TreeView.jsx":"3353e5397608","components/display/Avatar.jsx":"ba61d9a0012d","components/display/Badge.jsx":"f5dd38e2fbf3","components/display/Card.jsx":"d50e3496be76","components/display/Tag.jsx":"4087bf1bf372","components/forms/Checkbox.jsx":"04d57ed2f0f4","components/forms/Input.jsx":"7f7759e4ebf6","components/forms/Toggle.jsx":"53e98a0e1c5c","components/navigation/Tabs.jsx":"b04a13053a43","ui_kits/platform/PlatformEditor.jsx":"a5ccd81bd9af","ui_kits/platform/PlatformProjects.jsx":"eb3ffeb8b785","ui_kits/platform/PlatformShell.jsx":"788a8be77bf0","ui_kits/website/ProductExplorer.jsx":"d62b42f95f62","ui_kits/website/SiteHero.jsx":"08abcca8a7c3","ui_kits/website/SiteNav.jsx":"c160b9a61e7b","ui_kits/website/SiteUpdates.jsx":"c2ba845164c7"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.HiroDesignSystem_318aec = window.HiroDesignSystem_318aec || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/actions/BracketButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * BracketButton — Hiro's signature [ LABEL ] mono control.
 * Used for newsletter / CTA chrome across the marketing site.
 */
function BracketButton({
  children,
  filled = false,
  size = 'md',
  disabled = false,
  onClick,
  ...rest
}) {
  const pad = {
    sm: '7px 12px',
    md: '10px 16px',
    lg: '13px 22px'
  }[size];
  const fs = {
    sm: 11,
    md: 12,
    lg: 14
  }[size];
  const style = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: pad,
    fontFamily: 'var(--font-mono)',
    fontSize: fs,
    fontWeight: 700,
    letterSpacing: 'var(--ls-wide)',
    textTransform: 'uppercase',
    color: filled ? '#fff' : 'var(--text-strong)',
    background: filled ? 'var(--hiro-ink)' : 'transparent',
    border: '1px solid var(--hiro-ink)',
    borderRadius: 0,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.4 : 1,
    transition: 'background var(--dur-fast), color var(--dur-fast)'
  };
  return /*#__PURE__*/React.createElement("button", _extends({
    disabled: disabled,
    onClick: onClick,
    style: style,
    onMouseEnter: e => {
      if (disabled) return;
      e.currentTarget.style.background = filled ? 'var(--accent)' : 'var(--hiro-ink)';
      e.currentTarget.style.color = '#fff';
      e.currentTarget.style.borderColor = filled ? 'var(--accent)' : 'var(--hiro-ink)';
    },
    onMouseLeave: e => {
      e.currentTarget.style.background = filled ? 'var(--hiro-ink)' : 'transparent';
      e.currentTarget.style.color = filled ? '#fff' : 'var(--text-strong)';
      e.currentTarget.style.borderColor = 'var(--hiro-ink)';
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "["), children, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "]"));
}
Object.assign(__ds_scope, { BracketButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/actions/BracketButton.jsx", error: String((e && e.message) || e) }); }

// components/actions/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Hiro Button — primary action element.
 * Square-ish corners, Space Grotesk medium. Variants map to the
 * brand's ink / violet / outline / ghost treatments.
 */
function Button({
  children,
  variant = 'primary',
  size = 'md',
  arrow = false,
  fullWidth = false,
  disabled = false,
  type = 'button',
  onClick,
  ...rest
}) {
  const pad = {
    sm: '8px 14px',
    md: '11px 18px',
    lg: '15px 24px'
  }[size];
  const fs = {
    sm: 13,
    md: 15,
    lg: 17
  }[size];
  const variants = {
    primary: {
      background: 'var(--hiro-ink)',
      color: '#fff',
      border: '1px solid var(--hiro-ink)'
    },
    accent: {
      background: 'var(--accent)',
      color: '#fff',
      border: '1px solid var(--accent)'
    },
    secondary: {
      background: 'transparent',
      color: 'var(--text-strong)',
      border: '1px solid var(--border-strong)'
    },
    ghost: {
      background: 'transparent',
      color: 'var(--text-strong)',
      border: '1px solid transparent'
    }
  };
  const style = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: fullWidth ? '100%' : 'auto',
    padding: pad,
    fontFamily: 'var(--font-sans)',
    fontSize: fs,
    fontWeight: 500,
    lineHeight: 1,
    letterSpacing: '-0.01em',
    borderRadius: 'var(--radius-sm)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.4 : 1,
    transition: 'transform var(--dur-fast) var(--ease-out), background var(--dur-fast) var(--ease-out), opacity var(--dur-fast)',
    ...variants[variant]
  };
  return /*#__PURE__*/React.createElement("button", _extends({
    type: type,
    disabled: disabled,
    onClick: onClick,
    style: style,
    onMouseDown: e => !disabled && (e.currentTarget.style.transform = 'translateY(1px)'),
    onMouseUp: e => e.currentTarget.style.transform = 'translateY(0)',
    onMouseLeave: e => e.currentTarget.style.transform = 'translateY(0)'
  }, rest), children, arrow && /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      fontFamily: 'var(--font-mono)'
    }
  }, "\u2192"));
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/actions/Button.jsx", error: String((e && e.message) || e) }); }

// components/brand/Terminal.jsx
try { (() => {
/**
 * Terminal — dark code/CLI panel, a core Hiro brand motif.
 * Pass `lines` (array) or children. Each line may be a string or
 * { text, comment, prompt, tone }.
 */
function Terminal({
  title,
  lines,
  children,
  prompt = '$'
}) {
  const tones = {
    default: 'var(--text-on-dark)',
    muted: 'var(--hiro-gray)',
    accent: 'var(--hiro-violet-300)',
    orange: 'var(--hiro-orange)',
    green: 'var(--hiro-green)'
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface-terminal)',
      border: '1px solid var(--border-dark)',
      borderRadius: 'var(--radius-md)',
      overflow: 'hidden',
      fontFamily: 'var(--font-mono)',
      fontSize: 13.5,
      lineHeight: 1.7
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 7,
      padding: '11px 14px',
      borderBottom: '1px solid var(--border-dark)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 11,
      height: 11,
      borderRadius: '50%',
      background: '#36363a'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 11,
      height: 11,
      borderRadius: '50%',
      background: '#36363a'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 11,
      height: 11,
      borderRadius: '50%',
      background: '#36363a'
    }
  }), title && /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 8,
      fontSize: 11,
      color: 'var(--hiro-gray)',
      letterSpacing: '0.04em'
    }
  }, title)), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '16px 18px',
      color: 'var(--text-on-dark)'
    }
  }, lines ? lines.map((l, i) => {
    if (typeof l === 'string') {
      return /*#__PURE__*/React.createElement("div", {
        key: i
      }, l);
    }
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        color: tones[l.tone] || tones.default
      }
    }, l.prompt && /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--hiro-gray)'
      }
    }, prompt, " "), l.text, l.comment && /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--hiro-gray)'
      }
    }, "  # ", l.comment));
  }) : children));
}
Object.assign(__ds_scope, { Terminal });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/brand/Terminal.jsx", error: String((e && e.message) || e) }); }

// components/brand/TreeView.jsx
try { (() => {
/**
 * TreeView — the `$ tree` file-tree motif used to lay out Hiro's
 * product map. Renders nodes with ├──/└── connectors + comments.
 */
function TreeView({
  root = '.',
  nodes = [],
  onSelect
}) {
  const render = (items, prefix) => items.map((n, i) => {
    const last = i === items.length - 1;
    const branch = last ? '└──' : '├──';
    const childPrefix = prefix + (last ? '\u00A0\u00A0\u00A0\u00A0' : '│\u00A0\u00A0\u00A0');
    return /*#__PURE__*/React.createElement(React.Fragment, {
      key: (n.label || '') + i
    }, /*#__PURE__*/React.createElement("div", {
      onClick: n.onClick || onSelect && (() => onSelect(n)),
      style: {
        display: 'flex',
        alignItems: 'baseline',
        gap: 8,
        cursor: n.onClick || onSelect ? 'pointer' : 'default',
        padding: '2px 0',
        color: 'var(--text-strong)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--hiro-orange)',
        whiteSpace: 'pre'
      }
    }, prefix, branch), /*#__PURE__*/React.createElement("span", {
      style: {
        color: n.accent ? 'var(--accent)' : 'var(--text-strong)',
        borderBottom: n.onClick || onSelect ? '1px solid transparent' : 'none'
      }
    }, n.label), n.comment && /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--text-faint)'
      }
    }, "# ", n.comment)), n.children && render(n.children, childPrefix));
  });
  return /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 13.5,
      lineHeight: 1.7,
      color: 'var(--text-strong)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'var(--text-muted)',
      marginBottom: 4
    }
  }, "$ tree ", root), render(nodes, ''));
}
Object.assign(__ds_scope, { TreeView });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/brand/TreeView.jsx", error: String((e && e.message) || e) }); }

// components/display/Avatar.jsx
try { (() => {
/** Avatar — square monogram/image, Hiro-boxy. */
function Avatar({
  name = '',
  src,
  size = 40,
  square = true
}) {
  const initials = name.split(/\s+/).map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
  const base = {
    width: size,
    height: size,
    flex: 'none',
    borderRadius: square ? 'var(--radius-sm)' : '50%',
    overflow: 'hidden',
    display: 'grid',
    placeItems: 'center',
    background: 'var(--hiro-ink)',
    color: '#fff',
    fontFamily: 'var(--font-mono)',
    fontWeight: 700,
    fontSize: Math.round(size * 0.36),
    letterSpacing: '-0.02em'
  };
  if (src) {
    return /*#__PURE__*/React.createElement("img", {
      src: src,
      alt: name,
      style: {
        ...base,
        objectFit: 'cover'
      }
    });
  }
  return /*#__PURE__*/React.createElement("span", {
    style: base,
    "aria-label": name
  }, initials || '·');
}
Object.assign(__ds_scope, { Avatar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/Avatar.jsx", error: String((e && e.message) || e) }); }

// components/display/Badge.jsx
try { (() => {
/**
 * Badge — small status pill. Mono, uppercase, used for "NEW",
 * "BETA", "All systems normal", network status, etc.
 */
function Badge({
  children,
  tone = 'neutral',
  dot = false
}) {
  const tones = {
    neutral: {
      bg: 'var(--hiro-paper-2)',
      fg: 'var(--text-strong)',
      dotc: 'var(--hiro-gray)'
    },
    accent: {
      bg: 'var(--accent-wash)',
      fg: 'var(--accent-press)',
      dotc: 'var(--accent)'
    },
    orange: {
      bg: 'var(--hiro-orange-50)',
      fg: 'var(--hiro-orange-600)',
      dotc: 'var(--hiro-orange)'
    },
    success: {
      bg: 'var(--hiro-green-50)',
      fg: 'var(--hiro-green)',
      dotc: 'var(--hiro-green)'
    },
    warning: {
      bg: 'var(--hiro-yellow-50)',
      fg: '#9a7800',
      dotc: 'var(--hiro-yellow)'
    },
    danger: {
      bg: 'var(--hiro-red-50)',
      fg: 'var(--hiro-red)',
      dotc: 'var(--hiro-red)'
    }
  };
  const t = tones[tone] || tones.neutral;
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '4px 9px',
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: 'var(--ls-label)',
      textTransform: 'uppercase',
      color: t.fg,
      background: t.bg,
      borderRadius: 'var(--radius-xs)'
    }
  }, dot && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: '50%',
      background: t.dotc
    }
  }), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/Badge.jsx", error: String((e && e.message) || e) }); }

// components/display/Card.jsx
try { (() => {
const {
  useState
} = React;
/**
 * Card — bordered content block. Hiro cards are flat with a
 * hairline border + tiny radius; hover lifts subtly. Optional
 * eyebrow + trailing arrow for the "product" link style.
 */
function Card({
  children,
  eyebrow,
  title,
  arrow = false,
  interactive = false,
  padding = 24,
  onClick
}) {
  const [hover, setHover] = useState(false);
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      position: 'relative',
      background: 'var(--surface-card)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-md)',
      padding,
      cursor: interactive ? 'pointer' : 'default',
      transform: interactive && hover ? 'translateY(-2px)' : 'translateY(0)',
      borderColor: interactive && hover ? 'var(--hiro-ink)' : 'var(--border-subtle)',
      boxShadow: interactive && hover ? 'var(--shadow-md)' : 'var(--shadow-none)',
      transition: 'transform var(--dur-base) var(--ease-out), border-color var(--dur-base), box-shadow var(--dur-base)',
      fontFamily: 'var(--font-sans)'
    }
  }, eyebrow && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      letterSpacing: 'var(--ls-label)',
      textTransform: 'uppercase',
      color: 'var(--text-muted)',
      marginBottom: 10
    }
  }, eyebrow), title && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      fontWeight: 700,
      fontSize: 20,
      letterSpacing: '-0.015em',
      color: 'var(--text-strong)',
      marginBottom: children ? 8 : 0
    }
  }, /*#__PURE__*/React.createElement("span", null, title), arrow && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      color: 'var(--accent)'
    }
  }, "\u2192")), children && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15,
      lineHeight: 1.55,
      color: 'var(--text-muted)'
    }
  }, children));
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/Card.jsx", error: String((e && e.message) || e) }); }

// components/display/Tag.jsx
try { (() => {
/**
 * Tag — slash-prefixed mono category label used in Hiro nav and
 * filters ("/ Tools", "/ APIs"). Optional active state.
 */
function Tag({
  children,
  active = false,
  slash = true,
  onClick
}) {
  return /*#__PURE__*/React.createElement("span", {
    onClick: onClick,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      fontFamily: 'var(--font-mono)',
      fontSize: 12,
      letterSpacing: 'var(--ls-label)',
      textTransform: 'uppercase',
      color: active ? 'var(--text-strong)' : 'var(--text-muted)',
      cursor: onClick ? 'pointer' : 'default',
      borderBottom: active ? '1px solid var(--accent)' : '1px solid transparent',
      paddingBottom: 2,
      transition: 'color var(--dur-fast)'
    }
  }, slash && /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-faint)'
    }
  }, "/"), children);
}
Object.assign(__ds_scope, { Tag });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/Tag.jsx", error: String((e && e.message) || e) }); }

// components/forms/Checkbox.jsx
try { (() => {
/** Checkbox — square, ink/violet check. */
function Checkbox({
  checked = false,
  label,
  disabled = false,
  onChange,
  id
}) {
  const cid = id || (label ? `cb-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);
  return /*#__PURE__*/React.createElement("label", {
    htmlFor: cid,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 10,
      fontFamily: 'var(--font-sans)',
      fontSize: 15,
      color: 'var(--text-body)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.45 : 1
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 18,
      height: 18,
      flex: 'none',
      border: `1px solid ${checked ? 'var(--accent)' : 'var(--border-strong)'}`,
      background: checked ? 'var(--accent)' : 'transparent',
      borderRadius: 'var(--radius-xs)',
      display: 'grid',
      placeItems: 'center',
      transition: 'background var(--dur-fast), border-color var(--dur-fast)'
    }
  }, checked && /*#__PURE__*/React.createElement("svg", {
    width: "11",
    height: "11",
    viewBox: "0 0 12 12",
    fill: "none"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M2.5 6.2l2.2 2.3L9.5 3.5",
    stroke: "#fff",
    strokeWidth: "1.8",
    strokeLinecap: "square"
  }))), /*#__PURE__*/React.createElement("input", {
    id: cid,
    type: "checkbox",
    checked: checked,
    disabled: disabled,
    onChange: onChange,
    style: {
      position: 'absolute',
      opacity: 0,
      width: 0,
      height: 0
    }
  }), label);
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const {
  useState
} = React;
/**
 * Input — text field with optional mono label and prefix.
 * Hairline border, square corners, violet focus ring.
 */
function Input({
  label,
  placeholder,
  value,
  defaultValue,
  type = 'text',
  prefix,
  hint,
  error,
  disabled = false,
  mono = false,
  onChange,
  id,
  ...rest
}) {
  const [focus, setFocus] = useState(false);
  const inputId = id || (label ? `in-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);
  const borderColor = error ? 'var(--hiro-red)' : focus ? 'var(--accent)' : 'var(--border-subtle)';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      fontFamily: 'var(--font-sans)'
    }
  }, label && /*#__PURE__*/React.createElement("label", {
    htmlFor: inputId,
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      letterSpacing: 'var(--ls-label)',
      textTransform: 'uppercase',
      color: 'var(--text-muted)'
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      border: `1px solid ${borderColor}`,
      borderRadius: 'var(--radius-sm)',
      background: disabled ? 'var(--bg-sunken)' : 'var(--hiro-white)',
      boxShadow: focus ? '0 0 0 3px var(--accent-wash)' : 'none',
      transition: 'border-color var(--dur-fast), box-shadow var(--dur-fast)'
    }
  }, prefix && /*#__PURE__*/React.createElement("span", {
    style: {
      paddingLeft: 12,
      color: 'var(--text-faint)',
      fontFamily: 'var(--font-mono)',
      fontSize: 14
    }
  }, prefix), /*#__PURE__*/React.createElement("input", _extends({
    id: inputId,
    type: type,
    value: value,
    defaultValue: defaultValue,
    placeholder: placeholder,
    disabled: disabled,
    onChange: onChange,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      flex: 1,
      border: 'none',
      outline: 'none',
      background: 'transparent',
      padding: '10px 12px',
      fontFamily: mono ? 'var(--font-mono)' : 'var(--font-sans)',
      fontSize: 15,
      color: 'var(--text-strong)'
    }
  }, rest))), (hint || error) && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: error ? 'var(--hiro-red)' : 'var(--text-faint)'
    }
  }, error || hint));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/Toggle.jsx
try { (() => {
/** Toggle — pill switch. */
function Toggle({
  checked = false,
  label,
  disabled = false,
  onChange,
  id
}) {
  const tid = id || (label ? `tg-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);
  return /*#__PURE__*/React.createElement("label", {
    htmlFor: tid,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 10,
      fontFamily: 'var(--font-sans)',
      fontSize: 15,
      color: 'var(--text-body)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.45 : 1
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 40,
      height: 22,
      flex: 'none',
      borderRadius: 999,
      background: checked ? 'var(--accent)' : 'var(--hiro-paper-2)',
      border: `1px solid ${checked ? 'var(--accent)' : 'var(--border-subtle)'}`,
      position: 'relative',
      transition: 'background var(--dur-base) var(--ease-out)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: 2,
      left: checked ? 20 : 2,
      width: 16,
      height: 16,
      borderRadius: '50%',
      background: '#fff',
      boxShadow: 'var(--shadow-sm)',
      transition: 'left var(--dur-base) var(--ease-out)'
    }
  })), /*#__PURE__*/React.createElement("input", {
    id: tid,
    type: "checkbox",
    checked: checked,
    disabled: disabled,
    onChange: onChange,
    style: {
      position: 'absolute',
      opacity: 0,
      width: 0,
      height: 0
    }
  }), label);
}
Object.assign(__ds_scope, { Toggle });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Toggle.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Tabs.jsx
try { (() => {
const {
  useState
} = React;
/**
 * Tabs — mono uppercase tab bar with a sliding ink/violet
 * underline. Controlled or uncontrolled.
 */
function Tabs({
  tabs = [],
  value,
  defaultValue,
  onChange
}) {
  const [internal, setInternal] = useState(defaultValue ?? (tabs[0] && tabs[0].id));
  const active = value !== undefined ? value : internal;
  const select = id => {
    if (value === undefined) setInternal(id);
    onChange && onChange(id);
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 28,
      borderBottom: '1px solid var(--border-subtle)',
      fontFamily: 'var(--font-mono)'
    }
  }, tabs.map(t => {
    const on = t.id === active;
    return /*#__PURE__*/React.createElement("button", {
      key: t.id,
      onClick: () => select(t.id),
      style: {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '0 0 12px',
        marginBottom: -1,
        fontFamily: 'var(--font-mono)',
        fontSize: 12,
        letterSpacing: 'var(--ls-label)',
        textTransform: 'uppercase',
        color: on ? 'var(--text-strong)' : 'var(--text-muted)',
        borderBottom: `2px solid ${on ? 'var(--accent)' : 'transparent'}`,
        transition: 'color var(--dur-fast)'
      }
    }, t.label, t.count != null && /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--text-faint)',
        marginLeft: 6
      }
    }, t.count));
  }));
}
Object.assign(__ds_scope, { Tabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Tabs.jsx", error: String((e && e.message) || e) }); }

// ui_kits/platform/PlatformEditor.jsx
try { (() => {
/* Hiro Platform — Clarity code editor + console. */
function PlatformEditor({
  network
}) {
  const {
    Button,
    Badge
  } = window.HiroDesignSystem_318aec;
  const [active, setActive] = React.useState('counter.clar');
  const [log, setLog] = React.useState([{
    t: 'Clarinet 2.x · Clarity 3',
    tone: 'muted'
  }]);
  const files = ['counter.clar', 'utils.clar'];
  const code = [[';; counter.clar — a minimal counter', 'cmt'], ['(define-data-var count uint u0)', 'plain'], ['', 'plain'], ['(define-public (increment)', 'kw'], ['  (begin', 'plain'], ['    (var-set count (+ (var-get count) u1))', 'plain'], ['    (ok (var-get count))))', 'ok'], ['', 'plain'], ['(define-read-only (get-count)', 'kw'], ['  (ok (var-get count)))', 'ok']];
  const check = () => setLog(l => [...l, {
    t: '$ clarinet check',
    tone: 'prompt'
  }, {
    t: '✓ Contract counter.clar checked — 0 errors, 0 warnings',
    tone: 'green'
  }]);
  const deploy = () => setLog(l => [...l, {
    t: `$ clarinet deployments apply --${network.toLowerCase()}`,
    tone: 'prompt'
  }, {
    t: `→ Broadcasting counter.clar to ${network}…`,
    tone: 'orange'
  }, {
    t: '✓ Deployed · txid 0x9f3a…c21b',
    tone: 'green'
  }]);
  const toneColor = {
    muted: 'var(--hiro-gray)',
    prompt: 'var(--hiro-gray-2)',
    green: 'var(--hiro-green)',
    orange: 'var(--hiro-orange)'
  };
  const synColor = {
    cmt: 'var(--hiro-gray)',
    kw: 'var(--hiro-violet-300)',
    ok: 'var(--hiro-green)',
    plain: 'var(--text-on-dark)'
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      minWidth: 0,
      background: 'var(--surface-terminal)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 42,
      flex: 'none',
      display: 'flex',
      alignItems: 'stretch',
      justifyContent: 'space-between',
      borderBottom: '1px solid var(--border-dark)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex'
    }
  }, files.map(f => /*#__PURE__*/React.createElement("button", {
    key: f,
    onClick: () => setActive(f),
    style: {
      border: 'none',
      borderRight: '1px solid var(--border-dark)',
      cursor: 'pointer',
      padding: '0 18px',
      fontFamily: 'var(--font-mono)',
      fontSize: 13,
      background: active === f ? 'var(--surface-terminal-2)' : 'transparent',
      color: active === f ? 'var(--text-on-dark)' : 'var(--hiro-gray)',
      borderTop: active === f ? '2px solid var(--accent)' : '2px solid transparent'
    }
  }, f))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      paddingRight: 12
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: check,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      padding: '8px 14px',
      fontFamily: 'var(--font-sans)',
      fontSize: 13,
      fontWeight: 500,
      letterSpacing: '-0.01em',
      color: 'var(--text-on-dark)',
      background: 'transparent',
      border: '1px solid var(--border-dark)',
      borderRadius: 'var(--radius-sm)',
      cursor: 'pointer',
      transition: 'background var(--dur-fast)'
    },
    onMouseEnter: e => e.currentTarget.style.background = 'var(--surface-terminal-2)',
    onMouseLeave: e => e.currentTarget.style.background = 'transparent'
  }, "Check"), /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    variant: "accent",
    onClick: deploy
  }, "Deploy \u2192 ", network))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflow: 'auto',
      padding: '16px 0',
      fontFamily: 'var(--font-mono)',
      fontSize: 13.5,
      lineHeight: 1.7
    }
  }, code.map((ln, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'flex'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 44,
      flex: 'none',
      textAlign: 'right',
      paddingRight: 14,
      color: '#45454a',
      userSelect: 'none'
    }
  }, i + 1), /*#__PURE__*/React.createElement("span", {
    style: {
      color: synColor[ln[1]],
      whiteSpace: 'pre'
    }
  }, ln[0] || ' ')))), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 152,
      flex: 'none',
      borderTop: '1px solid var(--border-dark)',
      background: 'var(--hiro-black)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '8px 14px',
      borderBottom: '1px solid var(--border-dark)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      letterSpacing: 'var(--ls-label)',
      textTransform: 'uppercase',
      color: 'var(--hiro-gray)'
    }
  }, "Console"), /*#__PURE__*/React.createElement(Badge, {
    tone: network === 'Mainnet' ? 'orange' : network === 'Testnet' ? 'accent' : 'neutral',
    dot: true
  }, network)), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '10px 14px',
      overflow: 'auto',
      height: 'calc(100% - 37px)',
      fontFamily: 'var(--font-mono)',
      fontSize: 12.5,
      lineHeight: 1.65
    }
  }, log.map((l, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      color: toneColor[l.tone] || 'var(--text-on-dark)'
    }
  }, l.t)))));
}
window.PlatformEditor = PlatformEditor;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/platform/PlatformEditor.jsx", error: String((e && e.message) || e) }); }

// ui_kits/platform/PlatformProjects.jsx
try { (() => {
/* Hiro Platform — projects dashboard. */
function PlatformProjects({
  openProject
}) {
  const {
    Button,
    Badge
  } = window.HiroDesignSystem_318aec;
  const projects = [{
    name: 'counter',
    desc: 'A minimal Clarity counter contract.',
    contracts: 1,
    net: 'Devnet',
    updated: '2h ago'
  }, {
    name: 'nft-marketplace',
    desc: 'SIP-009 NFT listing & escrow contracts.',
    contracts: 4,
    net: 'Testnet',
    updated: 'Yesterday'
  }, {
    name: 'sbtc-vault',
    desc: 'A wrapped-BTC vault with Chainhook triggers.',
    contracts: 3,
    net: 'Devnet',
    updated: '3d ago'
  }];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflow: 'auto',
      background: 'var(--bg-paper)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 920,
      margin: '0 auto',
      padding: '40px 28px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      marginBottom: 24
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      letterSpacing: 'var(--ls-label)',
      textTransform: 'uppercase',
      color: 'var(--text-muted)',
      marginBottom: 8
    }
  }, "/ Your projects"), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: 36,
      letterSpacing: '-0.02em',
      color: 'var(--text-strong)',
      margin: 0
    }
  }, "Projects")), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    arrow: true
  }, "New project")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 16
    }
  }, projects.map(p => /*#__PURE__*/React.createElement("div", {
    key: p.name,
    onClick: () => openProject(p.name),
    style: {
      background: 'var(--surface-card)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-md)',
      padding: 22,
      cursor: 'pointer',
      transition: 'border-color var(--dur-base), transform var(--dur-base)'
    },
    onMouseEnter: e => {
      e.currentTarget.style.borderColor = 'var(--hiro-ink)';
      e.currentTarget.style.transform = 'translateY(-2px)';
    },
    onMouseLeave: e => {
      e.currentTarget.style.borderColor = 'var(--border-subtle)';
      e.currentTarget.style.transform = 'translateY(0)';
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 16,
      fontWeight: 700,
      color: 'var(--text-strong)'
    }
  }, p.name), /*#__PURE__*/React.createElement(Badge, {
    tone: p.net === 'Testnet' ? 'accent' : 'neutral',
    dot: true
  }, p.net)), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 14,
      color: 'var(--text-muted)',
      margin: '0 0 16px',
      lineHeight: 1.5
    }
  }, p.desc), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 16,
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      color: 'var(--text-faint)'
    }
  }, /*#__PURE__*/React.createElement("span", null, p.contracts, " contract", p.contracts > 1 ? 's' : ''), /*#__PURE__*/React.createElement("span", null, "updated ", p.updated)))))));
}
window.PlatformProjects = PlatformProjects;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/platform/PlatformProjects.jsx", error: String((e && e.message) || e) }); }

// ui_kits/platform/PlatformShell.jsx
try { (() => {
/* Hiro Platform — app chrome: top bar + left sidebar. */
function PlatformTopBar({
  project,
  network,
  setNetwork,
  onHome
}) {
  const {
    Avatar
  } = window.HiroDesignSystem_318aec;
  const nets = ['Devnet', 'Testnet', 'Mainnet'];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: 52,
      flex: 'none',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px',
      background: 'var(--surface-terminal)',
      borderBottom: '1px solid var(--border-dark)',
      color: 'var(--text-on-dark)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("span", {
    onClick: onHome,
    style: {
      width: 28,
      height: 28,
      background: '#fff',
      color: 'var(--hiro-ink)',
      borderRadius: 'var(--radius-sm)',
      display: 'grid',
      placeItems: 'center',
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: 17,
      cursor: 'pointer'
    }
  }, "H"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 13,
      color: 'var(--hiro-gray)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    onClick: onHome,
    style: {
      cursor: 'pointer'
    }
  }, "platform"), project && /*#__PURE__*/React.createElement("span", null, " / ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-on-dark)'
    }
  }, project)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      background: 'var(--surface-terminal-2)',
      border: '1px solid var(--border-dark)',
      borderRadius: 'var(--radius-sm)',
      padding: 3
    }
  }, nets.map(n => /*#__PURE__*/React.createElement("button", {
    key: n,
    onClick: () => setNetwork(n),
    style: {
      border: 'none',
      cursor: 'pointer',
      borderRadius: 4,
      padding: '5px 12px',
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
      background: network === n ? 'var(--accent)' : 'transparent',
      color: network === n ? '#fff' : 'var(--hiro-gray)'
    }
  }, n))), /*#__PURE__*/React.createElement(Avatar, {
    name: "Dev User",
    size: 28
  })));
}
function PlatformSidebar({
  active,
  files,
  openFile
}) {
  const items = [{
    id: 'explorer',
    label: 'Explorer'
  }, {
    id: 'deploy',
    label: 'Deploy'
  }, {
    id: 'devnet',
    label: 'Devnet'
  }];
  return /*#__PURE__*/React.createElement("aside", {
    style: {
      width: 232,
      flex: 'none',
      background: 'var(--surface-terminal-2)',
      borderRight: '1px solid var(--border-dark)',
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '14px 16px 10px',
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      letterSpacing: 'var(--ls-label)',
      textTransform: 'uppercase',
      color: 'var(--hiro-gray)'
    }
  }, "Project files"), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 10px',
      fontFamily: 'var(--font-mono)',
      fontSize: 13,
      lineHeight: 1.9,
      color: 'var(--hiro-gray-2)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'var(--text-on-dark)'
    }
  }, "\uD83D\uDCC1 contracts"), files.map(f => /*#__PURE__*/React.createElement("div", {
    key: f,
    onClick: () => openFile(f),
    style: {
      paddingLeft: 22,
      cursor: 'pointer',
      color: active === f ? 'var(--hiro-violet-300)' : 'var(--hiro-gray-2)',
      borderLeft: active === f ? '2px solid var(--accent)' : '2px solid transparent'
    }
  }, f)), /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'var(--text-on-dark)',
      marginTop: 4
    }
  }, "\uD83D\uDCC1 tests"), /*#__PURE__*/React.createElement("div", {
    style: {
      paddingLeft: 22
    }
  }, "counter_test.ts"), /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'var(--hiro-gray)',
      marginTop: 4
    }
  }, "Clarinet.toml")));
}
window.PlatformTopBar = PlatformTopBar;
window.PlatformSidebar = PlatformSidebar;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/platform/PlatformShell.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/ProductExplorer.jsx
try { (() => {
/* Hiro marketing — product explorer with Bento / Tree / Featured views. */
function ProductExplorer() {
  const {
    Tabs,
    Card,
    TreeView,
    Badge
  } = window.HiroDesignSystem_318aec;
  const [view, setView] = React.useState('bento');
  const products = [{
    eyebrow: 'Tool',
    title: 'Hiro Platform',
    desc: 'Write and deploy smart contracts from your browser.',
    badge: 'Beta'
  }, {
    eyebrow: 'Tool',
    title: 'Chainhook',
    desc: 'Re-org aware indexing engine for Bitcoin layers.',
    badge: 'New'
  }, {
    eyebrow: 'Tool',
    title: 'Ordhook',
    desc: 'A reliable client indexer for Ordinals.',
    badge: 'New'
  }, {
    eyebrow: 'API',
    title: 'Stacks Blockchain API',
    desc: 'Query the Stacks blockchain via REST endpoints.'
  }, {
    eyebrow: 'API',
    title: 'Token Metadata API',
    desc: 'Verify and display tokens and NFTs in your app.'
  }, {
    eyebrow: 'Docs',
    title: 'Hiro Docs',
    desc: 'Guides and references to set up Hiro tools.'
  }];
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: 'var(--bg-paper)',
      borderBottom: '1px solid var(--border-subtle)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1200,
      margin: '0 auto',
      padding: '64px 24px 72px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: 24,
      marginBottom: 28,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: 40,
      letterSpacing: '-0.02em',
      color: 'var(--text-strong)',
      margin: 0,
      maxWidth: 520
    }
  }, "Developer tools for Bitcoin layers"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      letterSpacing: 'var(--ls-label)',
      textTransform: 'uppercase',
      color: 'var(--text-faint)'
    }
  }, "View :"), /*#__PURE__*/React.createElement(Tabs, {
    value: view,
    onChange: setView,
    tabs: [{
      id: 'bento',
      label: 'Bento'
    }, {
      id: 'tree',
      label: 'Tree'
    }, {
      id: 'featured',
      label: 'Featured'
    }]
  }))), view === 'bento' && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 16
    }
  }, products.map(p => /*#__PURE__*/React.createElement("div", {
    key: p.title,
    style: {
      position: 'relative'
    }
  }, p.badge && /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: 16,
      right: 16,
      zIndex: 2
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: p.badge === 'Beta' ? 'warning' : 'accent'
  }, p.badge)), /*#__PURE__*/React.createElement(Card, {
    eyebrow: p.eyebrow,
    title: p.title,
    arrow: true,
    interactive: true
  }, p.desc)))), view === 'tree' && /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface-card)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-md)',
      padding: 28
    }
  }, /*#__PURE__*/React.createElement(TreeView, {
    root: "path/hiro",
    nodes: [{
      label: 'stacks',
      children: [{
        label: 'hiro-platform',
        comment: 'the web3 development platform for Stacks',
        accent: true
      }, {
        label: 'chainhook',
        comment: 'set actions in motion with IFTTT logic'
      }, {
        label: 'stacks-blockchain-api',
        comment: 'query information via REST endpoints'
      }, {
        label: 'token-metadata-api',
        comment: 'verify and display tokens & NFTs'
      }]
    }, {
      label: 'bitcoin',
      children: [{
        label: 'ordhook',
        comment: 'a reliable index for Ordinals'
      }]
    }]
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 12,
      color: 'var(--text-faint)',
      marginTop: 16
    }
  }, "2 directories, 2 apis, 3 tools")), view === 'featured' && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(Card, {
    eyebrow: "Featured \xB7 Stacks",
    title: "Chainhook",
    arrow: true,
    interactive: true,
    padding: 32
  }, "Build smarter apps with webhook-like triggers that react to onchain events in real time, on both Stacks and Bitcoin."), /*#__PURE__*/React.createElement(Card, {
    eyebrow: "Featured \xB7 Platform",
    title: "Hiro Platform",
    arrow: true,
    interactive: true,
    padding: 32
  }, "The web3 development platform for Stacks \u2014 write, test and deploy Clarity contracts directly from your browser."))));
}
window.ProductExplorer = ProductExplorer;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/ProductExplorer.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/SiteHero.jsx
try { (() => {
/* Hiro marketing — hero. Big uppercase headline + terminal visual. */
function SiteHero() {
  const {
    Button,
    Terminal,
    Badge
  } = window.HiroDesignSystem_318aec;
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: 'var(--bg-canvas)',
      borderBottom: '1px solid var(--border-subtle)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1200,
      margin: '0 auto',
      padding: '72px 24px 80px',
      display: 'grid',
      gridTemplateColumns: '1.05fr 0.95fr',
      gap: 56,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 12,
      letterSpacing: 'var(--ls-label)',
      textTransform: 'uppercase',
      color: 'var(--text-muted)',
      marginBottom: 22
    }
  }, "/ Developer tools for Bitcoin layers"), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: 76,
      lineHeight: 0.92,
      letterSpacing: '-0.035em',
      textTransform: 'uppercase',
      color: 'var(--text-strong)',
      margin: '0 0 24px'
    }
  }, "Build web3", /*#__PURE__*/React.createElement("br", null), "on ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--accent)'
    }
  }, "Bitcoin.")), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 19,
      lineHeight: 1.5,
      color: 'var(--text-muted)',
      maxWidth: 440,
      margin: '0 0 32px'
    }
  }, "Building on Bitcoin is hard. Hiro's developer tools make it easier."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    arrow: true
  }, "Start coding"), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "lg"
  }, "Read the docs"))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Terminal, {
    title: "~/hiro-quickstart",
    lines: [{
      text: 'npm create stacks@latest',
      prompt: true
    }, {
      text: 'cd my-bitcoin-app && clarinet check',
      prompt: true,
      comment: 'verify contracts',
      tone: 'accent'
    }, {
      text: '✓ 3 contracts checked, 0 errors',
      tone: 'green'
    }, {
      text: 'clarinet devnet start',
      prompt: true
    }, {
      text: 'Devnet running at http://localhost:8000',
      tone: 'muted'
    }, {
      text: 'chainhook predicate apply ./hooks/mint.json',
      prompt: true,
      comment: 'react to onchain events',
      tone: 'orange'
    }]
  }))));
}
window.SiteHero = SiteHero;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/SiteHero.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/SiteNav.jsx
try { (() => {
/* Hiro marketing — top nav. Logo + mono nav + actions. */
function SiteNav() {
  const {
    Button,
    Tag
  } = window.HiroDesignSystem_318aec;
  const items = ['Tools & APIs', 'Build', 'Resources', 'Company'];
  return /*#__PURE__*/React.createElement("header", {
    style: {
      position: 'sticky',
      top: 0,
      zIndex: 20,
      background: 'rgba(255,255,255,0.85)',
      backdropFilter: 'blur(8px)',
      borderBottom: '1px solid var(--border-subtle)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--hiro-ink)',
      color: 'var(--text-on-dark)',
      fontFamily: 'var(--font-mono)',
      fontSize: 12,
      letterSpacing: '0.02em',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 14,
      padding: '8px 16px',
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--hiro-gray-2)'
    }
  }, "Increased API rate limits, dedicated support channels."), /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: {
      color: 'var(--hiro-violet-300)',
      textDecoration: 'none'
    }
  }, "\u2192 Meet Hiro's new account tiers")), /*#__PURE__*/React.createElement("nav", {
    style: {
      maxWidth: 1200,
      margin: '0 auto',
      padding: '0 24px',
      height: 64,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 36
    }
  }, /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      textDecoration: 'none'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 30,
      height: 30,
      background: 'var(--hiro-ink)',
      color: '#fff',
      borderRadius: 'var(--radius-sm)',
      display: 'grid',
      placeItems: 'center',
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: 19,
      letterSpacing: '-0.04em'
    }
  }, "H"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: 24,
      letterSpacing: '-0.04em',
      color: 'var(--text-strong)'
    }
  }, "Hiro")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 22
    }
  }, items.map(t => /*#__PURE__*/React.createElement("a", {
    key: t,
    href: "#",
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 13,
      color: 'var(--text-muted)',
      textDecoration: 'none',
      display: 'flex',
      alignItems: 'center',
      gap: 5
    }
  }, t, " ", /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 9,
      color: 'var(--text-faint)'
    }
  }, "\u25BE"))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 18
    }
  }, /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 13,
      color: 'var(--text-muted)',
      textDecoration: 'none'
    }
  }, "Docs \u2197"), /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 13,
      color: 'var(--text-muted)',
      textDecoration: 'none'
    }
  }, "Sign in"), /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    variant: "primary"
  }, "Start building"))));
}
window.SiteNav = SiteNav;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/SiteNav.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/SiteUpdates.jsx
try { (() => {
/* Hiro marketing — latest posts & videos list + newsletter footer. */
function SiteUpdates() {
  const {
    Tag
  } = window.HiroDesignSystem_318aec;
  const posts = [{
    date: 'Feb 6, 2026',
    title: 'Chainhooks v2 Is Now Generally Available',
    kind: 'Blog post'
  }, {
    date: 'Feb 6, 2026',
    title: 'Upcoming Deprecation of Ordinals, Runes, and BRC-20 APIs',
    kind: 'Blog post'
  }, {
    date: 'Jun 10, 2025',
    title: "A Breakdown of Stacks' Proof of Transfer Smart Contract",
    kind: 'Video'
  }, {
    date: 'Jun 10, 2025',
    title: 'Building Faster Payment Solutions for Bitcoin',
    kind: 'Video'
  }];
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: 'var(--bg-canvas)',
      borderBottom: '1px solid var(--border-subtle)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1200,
      margin: '0 auto',
      padding: '64px 24px 72px'
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: 32,
      letterSpacing: '-0.02em',
      color: 'var(--text-strong)',
      margin: '0 0 28px'
    }
  }, "Latest posts & videos"), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: '1px solid var(--border-subtle)'
    }
  }, posts.map(p => /*#__PURE__*/React.createElement("a", {
    key: p.title,
    href: "#",
    style: {
      display: 'grid',
      gridTemplateColumns: '140px 1fr 120px',
      gap: 20,
      alignItems: 'center',
      padding: '20px 4px',
      borderBottom: '1px solid var(--border-subtle)',
      textDecoration: 'none'
    },
    onMouseEnter: e => e.currentTarget.style.background = 'var(--bg-paper)',
    onMouseLeave: e => e.currentTarget.style.background = 'transparent'
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 12,
      color: 'var(--text-faint)'
    }
  }, p.date), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 600,
      fontSize: 19,
      letterSpacing: '-0.01em',
      color: 'var(--text-strong)'
    }
  }, p.title), /*#__PURE__*/React.createElement("span", {
    style: {
      justifySelf: 'end'
    }
  }, /*#__PURE__*/React.createElement(Tag, null, p.kind)))))));
}
window.SiteUpdates = SiteUpdates;
function SiteFooter() {
  const {
    BracketButton,
    Checkbox,
    Badge
  } = window.HiroDesignSystem_318aec;
  const [agree, setAgree] = React.useState(false);
  const cols = [{
    h: 'Tools',
    items: ['Hiro Platform', 'Chainhooks']
  }, {
    h: 'APIs',
    items: ['Stacks Blockchain API', 'Token Metadata API', 'Pricing']
  }, {
    h: 'Build',
    items: ['Documentation', 'Guides']
  }, {
    h: 'Company',
    items: ['Careers # we\'re hiring', 'About us', 'Press']
  }, {
    h: 'Resources',
    items: ['Blog', 'Videos', 'Newsletter']
  }];
  return /*#__PURE__*/React.createElement("footer", {
    style: {
      background: 'var(--surface-terminal)',
      color: 'var(--text-on-dark)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1200,
      margin: '0 auto',
      padding: '56px 24px 40px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 40,
      alignItems: 'center',
      paddingBottom: 44,
      marginBottom: 44,
      borderBottom: '1px solid var(--border-dark)'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 30,
      height: 30,
      background: '#fff',
      color: 'var(--hiro-ink)',
      borderRadius: 'var(--radius-sm)',
      display: 'grid',
      placeItems: 'center',
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: 19
    }
  }, "H"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: 24
    }
  }, "Hiro")), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 16,
      color: 'var(--hiro-gray-2)',
      margin: 0,
      maxWidth: 360
    }
  }, "Stay up to date with product updates, learning resources, and more.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("input", {
    placeholder: "you@domain.com",
    style: {
      flex: 1,
      background: 'var(--surface-terminal-2)',
      border: '1px solid var(--border-dark)',
      borderRadius: 'var(--radius-sm)',
      padding: '12px 14px',
      color: '#fff',
      fontFamily: 'var(--font-mono)',
      fontSize: 14,
      outline: 'none'
    }
  }), /*#__PURE__*/React.createElement(BracketButton, {
    filled: true
  }, "Subscribe")), /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      gap: 9,
      alignItems: 'flex-start',
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      lineHeight: 1.4,
      color: 'var(--hiro-gray)',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement("span", {
    onClick: () => setAgree(!agree),
    style: {
      width: 16,
      height: 16,
      flex: 'none',
      marginTop: 1,
      border: '1px solid var(--hiro-gray)',
      background: agree ? 'var(--accent)' : 'transparent',
      borderColor: agree ? 'var(--accent)' : 'var(--hiro-gray)',
      display: 'grid',
      placeItems: 'center',
      color: '#fff',
      fontSize: 10
    }
  }, agree ? '✓' : ''), "I agree to receive marketing communications from Hiro, and consent to my data being processed per Hiro's Privacy Policy."))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(5, 1fr)',
      gap: 24
    }
  }, cols.map(c => /*#__PURE__*/React.createElement("div", {
    key: c.h
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      letterSpacing: 'var(--ls-label)',
      textTransform: 'uppercase',
      color: 'var(--hiro-gray-2)',
      marginBottom: 14
    }
  }, c.h, " /"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 9
    }
  }, c.items.map((it, i) => /*#__PURE__*/React.createElement("a", {
    key: it,
    href: "#",
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 13,
      color: 'var(--hiro-gray-2)',
      textDecoration: 'none'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--hiro-orange)'
    }
  }, i === c.items.length - 1 ? '└──' : '├──'), " ", it)))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 44,
      paddingTop: 24,
      borderTop: '1px solid var(--border-dark)',
      flexWrap: 'wrap',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 12,
      color: 'var(--hiro-gray)'
    }
  }, "\xA9 2026 Hiro Systems PBC"), /*#__PURE__*/React.createElement(Badge, {
    tone: "success",
    dot: true
  }, "All systems normal"))));
}
window.SiteFooter = SiteFooter;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/SiteUpdates.jsx", error: String((e && e.message) || e) }); }

__ds_ns.BracketButton = __ds_scope.BracketButton;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Terminal = __ds_scope.Terminal;

__ds_ns.TreeView = __ds_scope.TreeView;

__ds_ns.Avatar = __ds_scope.Avatar;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.Tag = __ds_scope.Tag;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Toggle = __ds_scope.Toggle;

__ds_ns.Tabs = __ds_scope.Tabs;

})();
