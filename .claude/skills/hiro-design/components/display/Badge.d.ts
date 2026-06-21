import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  /** @default "neutral" */
  tone?: 'neutral' | 'accent' | 'orange' | 'success' | 'warning' | 'danger';
  /** Show a leading status dot. @default false */
  dot?: boolean;
}

/** Small uppercase mono status pill (NEW / BETA / status). */
export function Badge(props: BadgeProps): JSX.Element;
