import { StyleSheet } from 'react-native';

export const FAB_SIZE = 48;
export const FAB_BOTTOM_SPACING = 16;

export const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 16,
  },
  button: {
    width: FAB_SIZE,
    height: FAB_SIZE,
  },
  bottomSheet: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.58,
    shadowRadius: 16.00,
    elevation: 24,
  },
  content: {
    paddingHorizontal: 24,
    gap: 24,
  },
  title: {
    letterSpacing: -0.4,
  },
});
