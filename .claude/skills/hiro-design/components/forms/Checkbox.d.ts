import React from 'react';

export interface CheckboxProps {
  checked?: boolean;
  label?: string;
  disabled?: boolean;
  id?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

/** Square checkbox with violet fill when checked. */
export function Checkbox(props: CheckboxProps): JSX.Element;
