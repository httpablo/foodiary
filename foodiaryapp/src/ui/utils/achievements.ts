import { AchievementCode } from '@app/types/Achievement';
import {
  BookmarkIcon,
  CalendarCheckIcon,
  CameraIcon,
  FlagIcon,
  FlameIcon,
  LucideIcon,
  MicIcon,
  ScaleIcon,
  TrophyIcon,
  UtensilsIcon,
} from 'lucide-react-native';

export type AchievementInfo = {
  code: AchievementCode;
  title: string;
  // How to unlock it, and what was done once unlocked.
  description: string;
  doneDescription: string;
  icon: LucideIcon;
};

export const achievementSections: { title: string; items: AchievementInfo[] }[] = [
  {
    title: 'Constância',
    items: [
      { code: 'FIRST_MEAL', title: 'Primeiro registro', description: 'Registre sua primeira refeição.', doneDescription: 'Você registrou sua primeira refeição.', icon: UtensilsIcon },
      { code: 'STREAK_7', title: 'Uma semana seguida', description: 'Registre refeições por 7 dias seguidos.', doneDescription: 'Você registrou refeições por 7 dias seguidos.', icon: FlameIcon },
      { code: 'STREAK_30', title: 'Um mês seguido', description: 'Registre refeições por 30 dias seguidos.', doneDescription: 'Você registrou refeições por 30 dias seguidos.', icon: FlameIcon },
      { code: 'STREAK_100', title: 'Cem dias seguidos', description: 'Registre refeições por 100 dias seguidos.', doneDescription: 'Você registrou refeições por 100 dias seguidos.', icon: TrophyIcon },
      { code: 'WEEKLY_TARGET', title: 'Semana cumprida', description: 'Registre refeições em 5 dias da mesma semana.', doneDescription: 'Você registrou refeições em 5 dias da mesma semana.', icon: CalendarCheckIcon },
    ],
  },
  {
    title: 'Peso',
    items: [
      { code: 'WEIGH_IN_4_WEEKS', title: 'Pesagem em dia', description: 'Registre seu peso por 4 semanas seguidas.', doneDescription: 'Você registrou seu peso por 4 semanas seguidas.', icon: ScaleIcon },
      { code: 'WEIGHT_GOAL_25', title: 'Primeiro quarto', description: 'Percorra 25% do caminho até a meta de peso.', doneDescription: 'Você percorreu 25% do caminho até a meta de peso.', icon: FlagIcon },
      { code: 'WEIGHT_GOAL_50', title: 'Metade do caminho', description: 'Percorra 50% do caminho até a meta de peso.', doneDescription: 'Você percorreu metade do caminho até a meta de peso.', icon: FlagIcon },
      { code: 'WEIGHT_GOAL_75', title: 'Reta final', description: 'Percorra 75% do caminho até a meta de peso.', doneDescription: 'Você percorreu 75% do caminho até a meta de peso.', icon: FlagIcon },
      { code: 'WEIGHT_GOAL_REACHED', title: 'Meta de peso alcançada', description: 'Chegue ao peso da sua meta.', doneDescription: 'Você chegou ao peso da sua meta.', icon: TrophyIcon },
    ],
  },
  {
    title: 'Formas de registrar',
    items: [
      { code: 'SAVED_FOOD', title: 'Alimento salvo', description: 'Salve um alimento para usar em outras refeições.', doneDescription: 'Você salvou um alimento para usar em outras refeições.', icon: BookmarkIcon },
      { code: 'PICTURE_MEAL', title: 'Prato fotografado', description: 'Registre uma refeição por foto.', doneDescription: 'Você registrou uma refeição por foto.', icon: CameraIcon },
      { code: 'AUDIO_MEAL', title: 'Refeição por áudio', description: 'Registre uma refeição por áudio.', doneDescription: 'Você registrou uma refeição por áudio.', icon: MicIcon },
    ],
  },
];

const byCode = new Map(achievementSections.flatMap(section => section.items).map(item => [item.code, item]));

export const achievementCount = byCode.size;

export function getAchievementInfo(code: AchievementCode): AchievementInfo | undefined {
  return byCode.get(code);
}
