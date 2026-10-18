import { createContext, use } from 'react';
import { TouchableOpacity, View } from 'react-native';

import { theme } from '@ui/styles/theme';

import { AppText } from '../AppText';
import { styles } from './styles';

interface IRadioGroupContextValue {
  value: string | null;
  setValue: (value: string) => void;
  isHorizontal: boolean;
  error: boolean;
}

const RadioGroupContext = createContext({} as IRadioGroupContextValue);

interface IRadioGroupProps {
  children: React.ReactNode;
  value: string | null;
  onChangeValue: (value: string) => void;
  orientation?: 'vertical' | 'horizontal';
  error?: boolean;
  errorMessage?: string;
  accessibilityLabel?: string;
  nativeID?: string;
  accessibilityLabelledBy?: string | string[];
}

export function RadioGroup({
  children,
  value,
  onChangeValue,
  orientation = 'vertical',
  error = false,
  errorMessage,
  accessibilityLabel,
  nativeID,
  accessibilityLabelledBy,
}: IRadioGroupProps) {
  const isHorizontal = orientation === 'horizontal';

  return (
    <RadioGroupContext.Provider
      value={{
        value,
        setValue: onChangeValue,
        isHorizontal,
        error,
      }}
    >
      <View style={styles.wrapper}>
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel={accessibilityLabel}
          accessibilityLabelledBy={accessibilityLabelledBy}
          nativeID={nativeID}
          style={[styles.container, isHorizontal && styles.containerHorizontal]}
        >
          {children}
        </View>

        {error && (
          <AppText
            size="sm"
            color={theme.colors.support.red}
            style={styles.errorMessage}
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
          >
            {errorMessage || 'Selecione uma opção para continuar.'}
          </AppText>
        )}
      </View>
    </RadioGroupContext.Provider>
  );
}

interface IRadioGroupItemProps {
  children: React.ReactNode;
  value: string;
  accessibilityLabel?: string;
}

const RadioGroupItemContext = createContext({ isSelected: false });

export function RadioGroupItem({ children, value, accessibilityLabel }: IRadioGroupItemProps) {
  const { value: selectedValue, setValue, isHorizontal, error } = use(RadioGroupContext);
  const isSelected = value === selectedValue;

  return (
    <RadioGroupItemContext.Provider value={{ isSelected }}>
      <TouchableOpacity
        accessibilityRole="radio"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ checked: isSelected, selected: isSelected }}
        style={[
          styles.item,
          isHorizontal && styles.horizontalItem,
          isSelected && styles.selectedItem,
          error && styles.errorItem,
        ]}
        onPress={() => setValue(value)}
      >
        {children}
      </TouchableOpacity>
    </RadioGroupItemContext.Provider>
  );
}

export function RadioGroupIcon({ children }: { children: string }) {
  const { error } = use(RadioGroupContext);
  const { isSelected } = use(RadioGroupItemContext);

  return (
    <View style={[styles.icon, (isSelected || error) && styles.whiteIconBg]}>
      <AppText>{children}</AppText>
    </View>
  );
}

export function RadioGroupLabel({ children }: { children: string }) {
  const { isHorizontal } = use(RadioGroupContext);

  return (
    <AppText weight="semiBold" style={[styles.label, isHorizontal && styles.textCenter]}>
      {children}
    </AppText>
  );
}

export function RadioGroupDescription({ children }: { children: string }) {
  const { isHorizontal } = use(RadioGroupContext);

  return (
    <AppText
      size="sm"
      color={theme.colors.gray[700]}
      style={[isHorizontal && styles.textCenter]}
    >
      {children}
    </AppText>
  );
}

export function RadioGroupItemInfo({ children }: { children: React.ReactNode }) {
  const { isHorizontal } = use(RadioGroupContext);

  return (
    <View style={[styles.itemInfo, !isHorizontal && styles.itemInfoVertical]}>
      {children}
    </View>
  );
}
