'use no memo';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
export function WidgetDetails({
  editUrl,
  postpone,
  height,
}: {
  editUrl: string;
  postpone?: Record<string, string | boolean>;
  height: number;
}) {
  return (
    <FlexWidget
      style={{
        width: 'match_parent',
        height,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        backgroundColor: '#e8e8e8',
      }}
    >
      <FlexWidget
        clickAction="OPEN_URI"
        clickActionData={{ uri: editUrl }}
        accessibilityLabel="Edit in app"
        style={{
          flex: 1,
          width: 0,
          height: 'match_parent',
          justifyContent: 'center',
        }}
      >
        <TextWidget
          text="✎ Edit in app"
          style={{ fontSize: 12, color: '#333333' }}
        />
      </FlexWidget>
      {postpone && (
        <FlexWidget
          clickAction="task_postpone"
          clickActionData={postpone}
          accessibilityLabel="Postpone task one day"
          style={{
            flex: 1,
            width: 0,
            height: 'match_parent',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <TextWidget
            text="Postpone →"
            style={{ fontSize: 12, color: '#a82549' }}
          />
        </FlexWidget>
      )}
    </FlexWidget>
  );
}
