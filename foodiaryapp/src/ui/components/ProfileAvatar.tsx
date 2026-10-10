import { theme } from '@ui/styles/theme';
import { UserRoundIcon } from 'lucide-react-native';
import { Image, View } from 'react-native';

export function ProfileAvatar({ photoUrl, size }: { photoUrl: string | null; size: number }) {
  return (
    <View style={{
      width: size,
      height: size,
      borderRadius: size / 2,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.gray[200],
    }}>
      {photoUrl ? (
        <Image source={{ uri: photoUrl }} style={{ width: size, height: size }} />
      ) : (
        <UserRoundIcon color={theme.colors.gray[700]} size={size * 0.55} />
      )}
    </View>
  );
}
