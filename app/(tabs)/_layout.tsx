import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName } from '../../src/components/Icon';
import { colors } from '../../src/theme';

const tabs: { name: string; title: string; icon: IconName }[] = [
  { name: 'index', title: 'Dzisiaj', icon: 'today' },
  { name: 'routines', title: 'Rutyny', icon: 'routines' },
  { name: 'history', title: 'Historia', icon: 'history' },
  { name: 'insights', title: 'Statystyki', icon: 'insights' },
];
export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.panel,
          borderTopColor: colors.border,
          height: 68 + insets.bottom,
          paddingTop: 8,
          paddingBottom: 8 + insets.bottom,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      {tabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarAccessibilityLabel: tab.title,
            tabBarIcon: ({ color, focused }) => (
              <View
                style={{
                  width: 64,
                  height: 34,
                  borderRadius: 24,
                  backgroundColor: focused ? '#3c1d27' : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name={tab.icon} color={color} size={24} />
              </View>
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
