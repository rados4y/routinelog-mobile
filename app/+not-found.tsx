import { Link } from 'expo-router';
import { Screen, EmptyState } from '../src/components/Screen';
import { colors } from '../src/theme';

export default function NotFound() {
  return (
    <Screen title="RoutineLog">
      <EmptyState
        title="Page not found"
        description="Return to your routines."
      />
      <Link href="/" style={{ color: colors.accentLight, padding: 16 }}>
        Go to Today
      </Link>
    </Screen>
  );
}
