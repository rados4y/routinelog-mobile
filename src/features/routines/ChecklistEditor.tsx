import { Text, TextInput, View } from 'react-native';
import type { ChecklistItem } from '../../domain/models';
import { Button } from '../../components/Button';
import { colors, common } from '../../theme';

export function ChecklistEditor({
  items,
  onChange,
}: {
  items: ChecklistItem[];
  onChange(items: ChecklistItem[]): void;
}) {
  return (
    <View style={common.card}>
      <Text style={common.heading}>Checklist (optional)</Text>
      <Text style={common.small}>
        Confirm every step each time you complete this routine. Checklists and
        confirmations are saved on this device; they are not stored in Notion.
      </Text>
      {items.map((item, index) => (
        <View key={item.id} style={{ gap: 6 }}>
          <TextInput
            accessibilityLabel={`Step ${index + 1}`}
            placeholder={`Step ${index + 1}`}
            placeholderTextColor={colors.muted}
            value={item.text}
            onChangeText={(text) =>
              onChange(
                items.map((entry) =>
                  entry.id === item.id ? { ...entry, text } : entry,
                ),
              )
            }
            maxLength={200}
            style={common.field}
          />
          <Button
            compact
            label={`Remove step ${index + 1}`}
            onPress={() =>
              onChange(items.filter((entry) => entry.id !== item.id))
            }
          />
        </View>
      ))}
      <Button
        label="Add step"
        icon="plus"
        disabled={items.length >= 30}
        onPress={() =>
          onChange([
            ...items,
            {
              id: `step-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
              text: '',
            },
          ])
        }
      />
      <Text style={common.small}>{items.length}/30 steps</Text>
    </View>
  );
}
