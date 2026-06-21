import React from 'react';

export interface ButtonProps {
  children: React.ReactNode;
  /** Visual treatment. @default "primary" */
  variant?: 'primary' | 'accent' | 'secondary' | 'ghost';
  /** @default "md" */
  size?: 'sm' | 'md' | 'lg';
  /** Append a mono "→" arrow. @default false */
  arrow?: boolean;
  fullWidth?: boolean;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

/**
 * Primary action button in the Hiro style.
 * @startingPoint section="Actions" subtitle="Ink / violet / outline buttons" viewport="700x180"
 */
export function Button(props: ButtonProps): JSX.Element;
