import type { ColorValue } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../theme';

const paths = {
  today:
    'M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2m3 12 3 3 5-5',
  routines: 'M9 6h12M9 12h12M9 18h12M3 6h.01M3 12h.01M3 18h.01',
  history: 'M3 11a9 9 0 1 1 2.6 7M3 4v7h7m2-4v5l3 2',
  insights: 'M4 20V10m8 10V4m8 16v-7',
  plus: 'M12 5v14M5 12h14',
  check: 'm5 12 4 4L19 6',
  skip: 'm5 5 10 7-10 7V5m14 0v14',
  undo: 'M3 10h11a6 6 0 0 1 0 12M3 10l5-5m-5 5 5 5',
  close: 'm6 6 12 12M6 18 18 6',
  edit: 'm16 3 5 5-12 12-6 1 1-6L16 3m-3 3 5 5',
};
export type IconName = keyof typeof paths;
export function Icon({
  name,
  color = colors.muted,
  size = 22,
}: {
  name: IconName;
  color?: ColorValue;
  size?: number;
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      accessibilityElementsHidden
    >
      <Path
        d={paths[name]}
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
