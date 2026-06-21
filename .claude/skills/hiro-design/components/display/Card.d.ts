import React from 'react';

export interface CardProps {
  children?: React.ReactNode;
  /** Uppercase mono eyebrow above the title. */
  eyebrow?: string;
  title?: string;
  /** Trailing violet "→" beside the title. @default false */
  arrow?: boolean;
  /** Hover lift + dark border. @default false */
  interactive?: boolean;
  padding?: number;
  onClick?: () => void;
}

/**
 * Flat bordered content / product card.
 * @startingPoint section="Surfaces" subtitle="Product & content cards" viewport="700x260"
 */
export function Card(props: CardProps): JSX.Element;
