'use no memo';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

export function WidgetSection({
  title,
  count,
  addUrl,
  height,
}: {
  title: string;
  count: string;
  addUrl?: string;
  height: number;
}) {
  return (
    <FlexWidget
      style={{
        width: 'match_parent',
        height,
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 12,
      }}
    >
      <FlexWidget style={{ flex: 1, width: 0 }}>
        <TextWidget
          text={title}
          maxLines={1}
          style={{ fontSize: 12, color: '#606060' }}
        />
      </FlexWidget>
      <TextWidget
        text={count}
        maxLines={1}
        style={{ fontSize: 10, color: '#606060', marginRight: 6 }}
      />
      <FlexWidget
        clickAction={addUrl ? 'OPEN_URI' : undefined}
        clickActionData={{ uri: addUrl }}
        accessibilityLabel={`Add ${title === 'Routines' ? 'routine' : title === 'Tasks' ? 'task' : 'daily note'}`}
        style={{
          width: 44,
          height,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <TextWidget
          text="+"
          style={{ fontSize: 23, color: addUrl ? '#c7355c' : '#bbbbbb' }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}
