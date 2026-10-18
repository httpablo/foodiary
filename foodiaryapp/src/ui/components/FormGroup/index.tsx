import { cloneElement, useId } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';

import { theme } from '@ui/styles/theme';

import { AppText } from '../AppText';
import { styles } from './styles';

interface IFormGroupChildProps {
  error?: boolean;
  accessibilityLabel?: string;
  nativeID?: string;
  accessibilityLabelledBy?: string | string[];
}

interface IFormGroupProps {
  label: string;
  children: React.ReactElement<IFormGroupChildProps>;
  error?: string;
  style?: StyleProp<ViewStyle>;
}

export function FormGroup({ label, children, error, style }: IFormGroupProps) {
  const baseId = useId();
  const labelId = `${baseId}-label`;
  const inputId = `${baseId}-input`;
  const errorId = `${baseId}-error`;

  return (
    <View style={[styles.container, style]}>
      <AppText weight="medium" nativeID={labelId}>{label}</AppText>
      {cloneElement(children, {
        error: !!error,
        accessibilityLabel: children.props.accessibilityLabel ?? label,
        nativeID: children.props.nativeID ?? inputId,
        accessibilityLabelledBy: children.props.accessibilityLabelledBy ?? labelId,
      })}
      {error && (
        <AppText
          nativeID={errorId}
          size="sm"
          color={theme.colors.support.red}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
        >
          {error}
        </AppText>
      )}
    </View>
  );
}
