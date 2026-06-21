import React from 'react';

export interface AvatarProps {
  name?: string;
  src?: string;
  /** px. @default 40 */
  size?: number;
  /** Square (boxy) vs circular. @default true */
  square?: boolean;
}

/** Square monogram/image avatar. */
export function Avatar(props: AvatarProps): JSX.Element;
