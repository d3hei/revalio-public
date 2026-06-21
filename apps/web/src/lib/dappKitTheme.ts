import { lightTheme, type Theme } from "@mysten/dapp-kit";

/** Hiro-aligned dapp-kit theme — orange primary (Sign in), square-ish corners. */
export const hiroDappKitTheme: Theme = {
  ...lightTheme,
  radii: {
    small: "4px",
    medium: "6px",
    large: "6px",
    xlarge: "12px",
  },
  shadows: {
    primaryButton: "none",
    walletItemSelected: "0 2px 6px rgba(12, 12, 13, 0.05)",
  },
  backgroundColors: {
    ...lightTheme.backgroundColors,
    primaryButton: "#f7931a",
    primaryButtonHover: "#d97908",
    modalPrimary: "#ffffff",
    modalSecondary: "#f6f5f1",
    walletItemHover: "rgba(12, 12, 13, 0.04)",
  },
  colors: {
    ...lightTheme.colors,
    primaryButton: "#0c0c0d",
    outlineButton: "#0c0c0d",
    body: "#0c0c0d",
    bodyMuted: "#6b6b70",
  },
  typography: {
    ...lightTheme.typography,
    fontFamily:
      '"Space Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace',
    letterSpacing: "0",
  },
};
