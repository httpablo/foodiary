import { useEffect, useRef, useState } from 'react';
import { TextInput, View } from 'react-native';

import { AppText } from '../AppText';
import { styles } from './styles';

export interface IDateInputProps {
  value: Date;
  onChange: (date: Date) => void;
  error?: boolean;
  disabled?: boolean;
}

function getParts(date?: Date) {
  if (!date || Number.isNaN(date.getTime())) {
    return { day: '', month: '', year: '' };
  }

  return {
    day: String(date.getDate()).padStart(2, '0'),
    month: String(date.getMonth() + 1).padStart(2, '0'),
    year: String(date.getFullYear()),
  };
}

type DateParts = ReturnType<typeof getParts>;

function toDate({ day, month, year }: DateParts): Date {
  if (day.length !== 2 || month.length !== 2 || year.length !== 4) {
    return new Date(NaN);
  }

  const parsed = new Date(Number(year), Number(month) - 1, Number(day));
  if (
    parsed.getFullYear() !== Number(year)
    || parsed.getMonth() + 1 !== Number(month)
    || parsed.getDate() !== Number(day)
  ) {
    return new Date(NaN);
  }

  return parsed;
}

export function DateInput({ value, onChange, error, disabled }: IDateInputProps) {
  const [parts, setParts] = useState(() => getParts(value));
  const monthRef = useRef<TextInput>(null);
  const yearRef = useRef<TextInput>(null);

  useEffect(() => {
    if (value && !Number.isNaN(value.getTime())) {
      setParts(getParts(value));
    }
  }, [value]);

  function updatePart(part: keyof DateParts, text: string) {
    const next = { ...parts, [part]: text.replace(/\D/g, '') };
    setParts(next);
    onChange(toDate(next));

    if (part === 'day' && next.day.length === 2) {
      monthRef.current?.focus();
    } else if (part === 'month' && next.month.length === 2) {
      yearRef.current?.focus();
    }
  }

  const fieldStyle = [styles.field, error && styles.fieldError, disabled && styles.fieldDisabled];

  return (
    <View style={styles.container}>
      <TextInput
        accessibilityLabel="Dia de nascimento"
        placeholder="DD"
        keyboardType="number-pad"
        maxLength={2}
        value={parts.day}
        onChangeText={text => updatePart('day', text)}
        editable={!disabled}
        selectTextOnFocus
        style={[fieldStyle, styles.shortField]}
      />
      <AppText style={styles.separator}>/</AppText>
      <TextInput
        ref={monthRef}
        accessibilityLabel="Mês de nascimento"
        placeholder="MM"
        keyboardType="number-pad"
        maxLength={2}
        value={parts.month}
        onChangeText={text => updatePart('month', text)}
        editable={!disabled}
        selectTextOnFocus
        style={[fieldStyle, styles.shortField]}
      />
      <AppText style={styles.separator}>/</AppText>
      <TextInput
        ref={yearRef}
        accessibilityLabel="Ano de nascimento"
        placeholder="AAAA"
        keyboardType="number-pad"
        maxLength={4}
        value={parts.year}
        onChangeText={text => updatePart('year', text)}
        editable={!disabled}
        selectTextOnFocus
        style={[fieldStyle, styles.yearField]}
      />
    </View>
  );
}
