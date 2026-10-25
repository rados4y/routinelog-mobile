import { Tabs } from 'expo-router';
import { Icon, type IconName } from '../../src/components/Icon';
import { colors } from '../../src/theme';

const tabs: { name: string; title: string; icon: IconName }[] = [
  { name: 'index', title: 'Dzisiaj', icon: 'today' },
  { name: 'routines', title: 'Rutyny', icon: 'routines' },
  { name: 'history', title: 'Historia', icon: 'history' },
  { name: 'insights', title: 'Statystyki', icon: 'insights' },
];
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accentLight,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.panel,
          borderTopColor: colors.border,
          paddingTop: 10,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', paddingBottom: 5 },
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
            tabBarIcon: ({ color }) => <Icon name={tab.icon} color={color} />,
          }}
        />
      ))}
    </Tabs>
  );
}
