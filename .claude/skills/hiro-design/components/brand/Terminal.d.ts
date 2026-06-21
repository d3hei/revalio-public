import React from 'react';

export interface TerminalLine {
  text: string;
  /** Trailing "# comment". */
  comment?: string;
  /** Show the leading prompt glyph. */
  prompt?: boolean;
  tone?: 'default' | 'muted' | 'accent' | 'orange' | 'green';
}

export interface TerminalProps {
  /** Window title shown next to the traffic lights. */
  title?: string;
  /** Array of lines (strings or TerminalLine objects). */
  lines?: Array<string | TerminalLine>;
  children?: React.ReactNode;
  /** Prompt glyph. @default "$" */
  prompt?: string;
}

/**
 * Dark CLI / code panel — a core Hiro brand motif.
 * @startingPoint section="Brand" subtitle="Terminal / CLI panel" viewport="700x280"
 */
export function Terminal(props: TerminalProps): JSX.Element;
