import { AppText } from '@ui/components/AppText';
import { theme } from '@ui/styles/theme';
import { useState } from 'react';
import { LayoutChangeEvent, View } from 'react-native';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';
import { styles } from './styles';

export interface IWeightChartPoint {
  date: string; // YYYY-MM-DD
  weight: number;
}

interface IWeightChartProps {
  /** Entries in any order; the chart sorts them ascending by date. */
  points: IWeightChartPoint[];
  targetWeight?: number;
  height?: number;
  accessibilityLabel?: string;
}

const PADDING = { top: 12, bottom: 12, left: 8, right: 44 };
const DAY_MS = 24 * 60 * 60 * 1000;

const toTime = (date: string) => new Date(`${date}T12:00:00`).getTime();
const formatKg = (value: number) => Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(value);
const formatShortDate = (date: string) => (
  Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(`${date}T12:00:00`)).replace('.', '')
);

// Mean of the entries within the 7 days ending at each entry.
function movingAverage(sorted: IWeightChartPoint[]) {
  return sorted.map((point, index) => {
    const time = toTime(point.date);
    const window = sorted.slice(0, index + 1).filter(item => time - toTime(item.date) < 7 * DAY_MS);
    return window.reduce((sum, item) => sum + item.weight, 0) / window.length;
  });
}

export function WeightChart({ points, targetWeight, height = 200, accessibilityLabel }: IWeightChartProps) {
  const [width, setWidth] = useState(0);
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));

  function handleLayout(event: LayoutChangeEvent) {
    setWidth(event.nativeEvent.layout.width);
  }

  if (sorted.length === 0) {
    return (
      <View style={[styles.empty, { height }]}>
        <AppText size="sm" color={theme.colors.gray[700]} align="center">
          Registre seu peso para ver o gráfico de evolução.
        </AppText>
      </View>
    );
  }

  const averages = movingAverage(sorted);
  const values = [...sorted.map(p => p.weight), ...(targetWeight !== undefined ? [targetWeight] : [])];
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const pad = Math.max((rawMax - rawMin) * 0.15, 0.5);
  const yMin = rawMin - pad;
  const yMax = rawMax + pad;

  const firstTime = toTime(sorted[0].date);
  const lastTime = toTime(sorted[sorted.length - 1].date);
  const plotWidth = Math.max(width - PADDING.left - PADDING.right, 0);
  const plotHeight = height - PADDING.top - PADDING.bottom;

  const x = (date: string) => (
    lastTime === firstTime
      ? PADDING.left + plotWidth / 2
      : PADDING.left + ((toTime(date) - firstTime) / (lastTime - firstTime)) * plotWidth
  );
  const y = (weight: number) => PADDING.top + (1 - (weight - yMin) / (yMax - yMin)) * plotHeight;

  const averageLine = averages.map((avg, index) => `${x(sorted[index].date)},${y(avg)}`).join(' ');
  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  const label = accessibilityLabel ?? (
    sorted.length > 1
      ? `Gráfico de peso: de ${formatKg(first.weight)} kg em ${formatShortDate(first.date)} para ${formatKg(last.weight)} kg em ${formatShortDate(last.date)}.`
      : `Gráfico de peso: ${formatKg(last.weight)} kg em ${formatShortDate(last.date)}.`
  );

  return (
    <View onLayout={handleLayout} accessible accessibilityRole="image" accessibilityLabel={label}>
      {width > 0 && (
        <Svg width={width} height={height}>
          {targetWeight !== undefined && (
            <>
              <Line
                x1={PADDING.left}
                x2={PADDING.left + plotWidth}
                y1={y(targetWeight)}
                y2={y(targetWeight)}
                stroke={theme.colors.support.tomato}
                strokeWidth={1.5}
                strokeDasharray="6,4"
              />
              <SvgText
                x={PADDING.left + plotWidth + 4}
                y={y(targetWeight) + 4}
                fontSize={11}
                fontFamily={theme.fontFamily.sans.regular}
                fill={theme.colors.supportText.tomato}
              >
                {`${formatKg(targetWeight)} kg`}
              </SvgText>
            </>
          )}
          {sorted.length > 1 && (
            <Polyline
              points={averageLine}
              fill="none"
              stroke={theme.colors.lime[700]}
              strokeWidth={2.5}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}
          {sorted.map(point => (
            <Circle
              key={point.date}
              cx={x(point.date)}
              cy={y(point.weight)}
              r={3}
              fill={theme.colors.gray[600]}
            />
          ))}
          <SvgText
            x={PADDING.left + plotWidth + 4}
            y={y(last.weight) - 6}
            fontSize={11}
            fontFamily={theme.fontFamily.sans.semiBold}
            fill={theme.colors.black[700]}
          >
            {`${formatKg(last.weight)}`}
          </SvgText>
        </Svg>
      )}

      <View style={styles.xLabels}>
        <AppText size="xs" color={theme.colors.gray[700]}>{formatShortDate(first.date)}</AppText>
        {sorted.length > 1 && (
          <AppText size="xs" color={theme.colors.gray[700]}>{formatShortDate(last.date)}</AppText>
        )}
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: theme.colors.gray[600] }]} />
          <AppText size="xs" color={theme.colors.gray[700]}>Registros</AppText>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendLine, { backgroundColor: theme.colors.lime[700] }]} />
          <AppText size="xs" color={theme.colors.gray[700]}>Média 7 dias</AppText>
        </View>
        {targetWeight !== undefined && (
          <View style={styles.legendItem}>
            <View style={[styles.legendLine, { backgroundColor: theme.colors.support.tomato }]} />
            <AppText size="xs" color={theme.colors.gray[700]}>Meta</AppText>
          </View>
        )}
      </View>
    </View>
  );
}
