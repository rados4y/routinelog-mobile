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
      <Text style={common.heading}>Lista kroków (opcjonalnie)</Text>
      <Text style={common.small}>
        Wszystkie kroki trzeba potwierdzić przy każdym wykonaniu. Lista i
        potwierdzenia są zapisywane na tym urządzeniu; Notion ich nie
        przechowuje.
      </Text>
      {items.map((item, index) => (
        <View key={item.id} style={{ gap: 6 }}>
          <TextInput
            accessibilityLabel={`Krok ${index + 1}`}
            placeholder={`Krok ${index + 1}`}
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
            label={`Usuń krok ${index + 1}`}
            onPress={() =>
              onChange(items.filter((entry) => entry.id !== item.id))
            }
          />
        </View>
      ))}
      <Button
        label="Dodaj krok"
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
      <Text style={common.small}>{items.length}/30 kroków</Text>
    </View>
  );
}
