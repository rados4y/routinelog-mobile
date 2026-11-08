import { View } from 'react-native';
import { Icon } from './Icon';
import { colors } from '../theme';

export function NoteDateMarker({
  testID,
  selected = false,
}: {
  testID: string;
  selected?: boolean;
}) {
  return (
    <View testID={testID} pointerEvents="none" accessible={false}>
      <Icon
        name="notes"
        size={12}
        color={selected ? colors.text : colors.accentLight}
      />
    </View>
  );
}
