import { Pressable, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { colors } from '../../theme';
import { useNotion } from './useNotion';

export function NotionButton() {
  const issue = useNotion((state) => state.error);
  const busy = useNotion((state) => state.busy);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        issue
          ? 'Synchronizacja z Notion: wymaga uwagi'
          : 'Synchronizacja z Notion'
      }
      onPress={() => router.push('/notion')}
      style={styles.button}
    >
      <Text style={[styles.letter, issue && { color: colors.warning }]}>
        {busy ? '↻' : 'N'}
      </Text>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.muted,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: { color: colors.accentLight, fontSize: 18, fontWeight: '800' },
});
