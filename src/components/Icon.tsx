import type { ColorValue } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../theme';

const paths = {
  widget: 'M3 3h7v7H3V3m11 0h7v7h-7V3M3 14h7v7H3v-7m11 0h7v7h-7v-7',
  circle: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20',
  brand: 'M3 6h9M3 12h6M3 18h9M16 2a6 6 0 1 0 0 12 6 6 0 0 0 0-12',
  search: 'M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14m5 12 6 6',
  filter: 'M3 5h18M6 11h12M10 17h4',
  calendar:
    'M8 2v4m8-4v4M3 9h18M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2m2 9h.01m5 0h.01m5 0h.01M7 17h.01m5 0h.01',
  archive: 'M4 4h16v17H4V4m1-3h14M12 8v9m-4-4 4 4 4-4',
  more: 'M12 4h.01M12 12h.01M12 20h.01',
  chain:
    'm10 14 4-4m-6 6-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2 0 1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0',
  checkCircle: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20m-5 10 3 3 7-7',
  chat: 'M3 4h18v13H9l-6 4V4m4 4h10M7 12h7',
  graduation: 'm2 8 10-5 10 5-10 5L2 8m4 3v7l6 3 6-3v-7m4-3v9',
  mountain: 'm2 19 6-10 5 7 3-4 6 7H2',
  arrowLeft: 'm15 5-7 7 7 7',
  arrowRight: 'm9 5 7 7-7 7',
  today:
    'M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2m3 12 3 3 5-5',
  routines:
    'M12 2a7 7 0 1 0 0 14 7 7 0 0 0 0-14m-4 13-2 7 6-3 6 3-2-7M12 5l1 3 3 .2-2.5 2 1 3-2.5-1.7L9.5 13l1-3-2.5-2 3-.2L12 5',
  history: 'M3 11a9 9 0 1 1 2.6 7M3 4v7h7m2-4v5l3 2',
  insights: 'M4 20V10m8 10V4m8 16v-7',
  plus: 'M12 5v14M5 12h14',
  check: 'm5 12 4 4L19 6',
  skip: 'm5 5 10 7-10 7V5m14 0v14',
  undo: 'M3 10h11a6 6 0 0 1 0 12M3 10l5-5m-5 5 5 5',
  close: 'm6 6 12 12M6 18 18 6',
  edit: 'm16 3 5 5-12 12-6 1 1-6L16 3m-3 3 5 5',
  chevronDown: 'm6 9 6 6 6-6',
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
