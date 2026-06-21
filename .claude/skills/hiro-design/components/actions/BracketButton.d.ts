import React from 'react';

export interface BracketButtonProps {
  children: React.ReactNode;
  /** Solid ink fill vs. outline. @default false */
  filled?: boolean;
  /** @default "md" */
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

/** Hiro's signature [ LABEL ] monospace control. */
export function BracketButton(props: BracketButtonProps): JSX.Element;
