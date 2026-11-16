import { View, Text } from 'react-native';
import { Icon } from './Icon';
import { NoteDateMarker } from './NoteDateMarker';
import { colors } from '../theme';

export function DayMarkers({
  date,
  prefix,
  note,
  missed,
  done,
}: {
  date: string;
  prefix: string;
  note: boolean;
  missed: boolean;
  done: boolean;
}) {
  return (
    <View
      pointerEvents="none"
      style={{
        flexDirection: 'row',
        gap: prefix === 'calendar' ? 0 : 2,
        minHeight: 12,
      }}
    >
      {note && <NoteDateMarker testID={`${prefix}-note-${date}`} />}
      {missed && (
        <View testID={`${prefix}-task-missed-${date}`}>
          <Icon
            name="missedCircle"
            color={colors.danger}
            size={prefix === 'calendar' ? 11 : 12}
          />
        </View>
      )}
      {done && (
        <View testID={`${prefix}-task-done-${date}`}>
          <Icon
            name="checkCircle"
            color={colors.success}
            size={prefix === 'calendar' ? 11 : 12}
          />
        </View>
      )}
    </View>
  );
}
export function dayMarkerHint(note: boolean, missed: boolean, done: boolean) {
  return (
    [
      note && 'Has daily note',
      missed && 'Has missed task',
      done && 'Has completed task',
    ]
      .filter(Boolean)
      .join('. ') || undefined
  );
}

export function DayMarkerLegend() {
  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        justifyContent: 'center',
        paddingVertical: 7,
      }}
    >
      {(
        [
          ['notes', '#91acff', 'Note'],
          ['missedCircle', colors.danger, 'Task missed'],
          ['checkCircle', colors.success, 'Task done'],
        ] as const
      ).map(([name, color, label]) => (
        <View
          key={name}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}
        >
          <Icon name={name} color={color} size={12} />
          <Text style={{ fontSize: 11, color: colors.muted }}>{label}</Text>
        </View>
      ))}
    </View>
  );
}
