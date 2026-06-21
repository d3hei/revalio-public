import { useState } from "react";
import { Link } from "react-router-dom";

export function OtherNavMenu() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <div
      className="site-nav-menu"
      onMouseLeave={close}
      onKeyDown={(e) => {
        if (e.key === "Escape") close();
      }}
    >
      <button
        type="button"
        className="site-nav-btn site-nav-menu-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        Other
        <span className="site-nav-caret" aria-hidden>
          ▾
        </span>
      </button>
      <div className={"site-nav-dropdown" + (open ? " is-open" : "")} role="menu">
        <Link to="/compare" className="site-nav-menu-item" role="menuitem" onClick={close}>
          Compare wallets
        </Link>
        <Link to="/whales" className="site-nav-menu-item" role="menuitem" onClick={close}>
          Whales
        </Link>
        <Link to="/watchlist" className="site-nav-menu-item" role="menuitem" onClick={close}>
          Watchlist
        </Link>
        <Link to="/badges" className="site-nav-menu-item" role="menuitem" onClick={close}>
          Badges
        </Link>
      </div>
    </div>
  );
}
