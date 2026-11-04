import { useState } from 'react';
import { View, TextInput, ScrollView } from 'react-native';
import { categories, type Routine } from '../../domain/models';
import { colors, common } from '../../theme';
import { categoryLabels } from '../../i18n/en';
import { Chip } from './ScheduleEditor';

export function useRoutineFilter() {
  const [search, setSearch] = useState(false);
  const [filters, setFilters] = useState(false);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  return {
    search,
    filters,
    toggleSearch: () => {
      if (search) setQuery('');
      setSearch(!search);
    },
    activeFilter: category !== null,
    toggleFilters: () => setFilters(!filters),
    matches: (routine: Routine) =>
      (!category || routine.category === category) &&
      routine.name
        .toLocaleLowerCase('pl')
        .includes(query.toLocaleLowerCase('pl').trim()),
    panel: (
      <View style={{ paddingHorizontal: 10, gap: 8 }}>
        {search && (
          <TextInput
            accessibilityLabel="Search routines"
            placeholder="Search routines…"
            placeholderTextColor={colors.muted}
            value={query}
            onChangeText={setQuery}
            style={[common.field, { marginBottom: 8 }]}
          />
        )}
        {filters && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 6, paddingBottom: 10 }}
          >
            <Chip
              label="All categories"
              selected={category === null}
              onPress={() => setCategory(null)}
            />
            {categories.map((value) => (
              <Chip
                key={value}
                label={categoryLabels[value]}
                selected={value === category}
                onPress={() => setCategory(value)}
              />
            ))}
          </ScrollView>
        )}
      </View>
    ),
  };
}
