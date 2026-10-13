import { theme } from '@ui/styles/theme';
import type { CSSProperties } from 'react';

import type { IDateInputProps } from './index';

function toInputValue(date?: Date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return '';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function DateInput({ value, onChange, error, disabled }: IDateInputProps) {
  const style: CSSProperties = {
    boxSizing: 'border-box',
    width: '100%',
    height: 52,
    padding: '0 14px',
    border: `1px solid ${error ? theme.colors.support.red : theme.colors.gray[400]}`,
    borderRadius: 10,
    backgroundColor: theme.colors.white,
    color: theme.colors.black[700],
    fontFamily: theme.fontFamily.sans.regular,
    fontSize: 16,
    opacity: disabled ? 0.5 : 1,
  };

  return (
    <input
      aria-label="Data de nascimento"
      type="date"
      value={toInputValue(value)}
      max={toInputValue(new Date())}
      onChange={event => {
        const [year, month, day] = event.currentTarget.value.split('-').map(Number);
        onChange(year && month && day ? new Date(year, month - 1, day) : new Date(NaN));
      }}
      disabled={disabled}
      style={style}
    />
  );
}
