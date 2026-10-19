export const formatNumber = (value: number, maximumFractionDigits = 1) => (
  Intl.NumberFormat('pt-BR', { maximumFractionDigits }).format(value)
);

export const formatKg = (value: number) => `${formatNumber(value)} kg`;

export const formatSignedKg = (value: number) => {
  const rounded = Math.round(value * 10) / 10;
  return `${rounded > 0 ? '+' : ''}${formatNumber(rounded)} kg`;
};

function toLocalDate(date: string): Date {
  return new Date(`${date.slice(0, 10)}T12:00:00`);
}

// "12 de mar."
export function formatShortDate(date: string): string {
  return Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short' }).format(toLocalDate(date));
}

// "12 de mar. de 2026"
export function formatFullDate(date: string): string {
  return Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' }).format(toLocalDate(date));
}
