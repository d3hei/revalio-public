import React from 'react';

export interface TagProps {
  children: React.ReactNode;
  active?: boolean;
  /** Show the leading "/" glyph. @default true */
  slash?: boolean;
  onClick?: () => void;
}

/** Slash-prefixed mono category label ("/ Tools"). */
export function Tag(props: TagProps): JSX.Element;
