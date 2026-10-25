import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '../theme';

export function ProgressRing({ percent }: { percent: number }) {
  const length = 2 * Math.PI * 42;
  return (
    <View
      style={styles.ring}
      accessible
      accessibilityLabel={`Realizacja ${percent} procent`}
    >
      <Svg width={104} height={104} viewBox="0 0 104 104">
        <Circle
          cx={52}
          cy={52}
          r={42}
          fill="none"
          stroke={colors.border}
          strokeWidth={7}
        />
        <Circle
          cx={52}
          cy={52}
          r={42}
          fill="none"
          stroke={colors.accentLight}
          strokeWidth={7}
          strokeDasharray={`${length} ${length}`}
          strokeDashoffset={length * (1 - percent / 100)}
          strokeLinecap="round"
          rotation={-90}
          origin="52, 52"
        />
      </Svg>
      <View style={styles.label}>
        <Text style={styles.percent}>
          {percent}
          <Text style={styles.sign}>%</Text>
        </Text>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  ring: { width: 104, height: 104 },
  label: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  percent: { color: colors.text, fontSize: 26, fontWeight: '800' },
  sign: { fontSize: 14, color: colors.muted },
});
