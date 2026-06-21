import React from 'react';

export interface ToggleProps {
  checked?: boolean;
  label?: string;
  disabled?: boolean;
  id?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

/** Pill toggle switch with violet "on" state. */
export function Toggle(props: ToggleProps): JSX.Element;
