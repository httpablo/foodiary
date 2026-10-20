import { useAchievements } from '@app/hooks/queries/useAchievements';
import { AppHeader } from '@ui/components/AppHeader';
import { AppText } from '@ui/components/AppText';
import { Button } from '@ui/components/Button';
import { theme } from '@ui/styles/theme';
import { achievementCount, achievementSections } from '@ui/utils/achievements';
import { LockIcon } from 'lucide-react-native';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { styles } from './styles';

const formatDate = (value: string) => Intl.DateTimeFormat('pt-BR', {
  day: '2-digit', month: 'short', year: 'numeric',
}).format(new Date(value));

export function Achievements() {
  const { top, bottom } = useSafeAreaInsets();
  const { achievements, isLoading, isError, refetch } = useAchievements();
  const unlockedAt = new Map(achievements.map(item => [item.code, item.unlockedAt]));
  const unlockedCount = achievementSections
    .flatMap(section => section.items)
    .filter(item => unlockedAt.has(item.code)).length;

  return (
    <View style={[styles.container, { paddingTop: top }]}>
      <AppHeader title="Conquistas" />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottom + 32 }]}>
        <View style={styles.intro}>
          <AppText size="2xl" weight="semiBold">Suas conquistas</AppText>
          <AppText color={theme.colors.gray[700]}>
            Marcos da sua rotina de registros e da sua meta de peso.
          </AppText>
        </View>

        {isLoading ? (
          <ActivityIndicator style={styles.loading} color={theme.colors.lime[700]} />
        ) : isError ? (
          <View style={styles.errorCard}>
            <AppText weight="medium">Não foi possível carregar as conquistas.</AppText>
            <Button variant="secondary" onPress={() => refetch()}>Tentar novamente</Button>
          </View>
        ) : (
          <>
            <View style={styles.heroCard}>
              <AppText weight="medium">Desbloqueadas</AppText>
              <View style={styles.heroValueRow}>
                <AppText size="3xl" weight="semiBold">{unlockedCount}</AppText>
                <AppText color={theme.colors.gray[700]}>de {achievementCount}</AppText>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${(unlockedCount / achievementCount) * 100}%` }]} />
              </View>
            </View>

            {achievementSections.map(section => (
              <View key={section.title} style={styles.section}>
                <AppText size="lg" weight="semiBold">{section.title}</AppText>
                <View style={styles.list}>
                  {section.items.map(({ code, title, description, doneDescription, icon: Icon }) => {
                    const date = unlockedAt.get(code);
                    return (
                      <View
                        key={code}
                        accessible
                        accessibilityLabel={date ? `${title}. ${doneDescription} Desbloqueada em ${formatDate(date)}.` : `${title}. ${description} Ainda bloqueada.`}
                        style={[styles.item, !date && styles.itemLocked]}
                      >
                        <View style={[styles.itemIcon, !date && styles.itemIconLocked]}>
                          {date
                            ? <Icon size={20} color={theme.colors.lime[900]} />
                            : <LockIcon size={18} color={theme.colors.gray[700]} />}
                        </View>
                        <View style={styles.itemText}>
                          <AppText weight="semiBold" color={date ? theme.colors.black[700] : theme.colors.gray[700]}>
                            {title}
                          </AppText>
                          <AppText size="sm" color={theme.colors.gray[700]}>{date ? doneDescription : description}</AppText>
                          {date && (
                            <AppText size="xs" color={theme.colors.supportText.green}>
                              Desbloqueada em {formatDate(date)}
                            </AppText>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}
