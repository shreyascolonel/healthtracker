import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { Colors, Spacing, FontSize } from '@/constants/theme';

const screenWidth = Dimensions.get('window').width - 32;

interface ChartProps {
  title: string;
  labels: string[];
  data: number[];
  color?: string;
  unit?: string;
  type?: 'line' | 'bar';
}

export function ProgressChart({ title, labels, data, color = Colors.primary, unit = '', type = 'line' }: ChartProps) {
  if (data.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.empty}>No data yet. Start logging to see your progress!</Text>
      </View>
    );
  }

  const chartConfig = {
    backgroundColor: Colors.surface,
    backgroundGradientFrom: Colors.surface,
    backgroundGradientTo: Colors.surface,
    decimalPlaces: 1,
    color: (opacity = 1) => {
      const hex = color.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    },
    labelColor: () => Colors.textSecondary,
    propsForDots: { r: '4', strokeWidth: '2', stroke: color },
    propsForBackgroundLines: { strokeDasharray: '', stroke: Colors.border, strokeWidth: 0.5 },
  };

  const displayLabels = labels.length > 7
    ? labels.filter((_, i) => i % Math.ceil(labels.length / 7) === 0)
    : labels;

  const displayData = labels.length > 7
    ? data.filter((_, i) => i % Math.ceil(labels.length / 7) === 0)
    : data;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {type === 'line' ? (
        <LineChart
          data={{ labels: displayLabels, datasets: [{ data: displayData.length ? displayData : [0] }] }}
          width={screenWidth}
          height={200}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
          formatYLabel={(v) => `${v}${unit}`}
        />
      ) : (
        <BarChart
          data={{ labels: displayLabels, datasets: [{ data: displayData.length ? displayData : [0] }] }}
          width={screenWidth}
          height={200}
          chartConfig={chartConfig}
          style={styles.chart}
          yAxisLabel=""
          yAxisSuffix={unit}
          fromZero
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  chart: { borderRadius: 12, marginLeft: -8 },
  empty: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingVertical: Spacing.xl,
  },
});
