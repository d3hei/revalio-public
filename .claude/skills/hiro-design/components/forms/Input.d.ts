import React from 'react';

export interface InputProps {
  label?: string;
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  type?: string;
  /** Leading mono prefix glyph, e.g. "$" or "@". */
  prefix?: string;
  hint?: string;
  error?: string;
  disabled?: boolean;
  /** Render the typed value in monospace. @default false */
  mono?: boolean;
  id?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

/** Text input with mono label, focus ring and error state. */
export function Input(props: InputProps): JSX.Element;
