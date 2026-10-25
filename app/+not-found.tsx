import { Link } from 'expo-router';
import { Screen, EmptyState } from '../src/components/Screen';
import { colors } from '../src/theme';

export default function NotFound() {
  return (
    <Screen title="RoutineLog">
      <EmptyState
        title="Nie ma takiego ekranu"
        description="Wróć do swoich rutyn."
      />
      <Link href="/" style={{ color: colors.accentLight, padding: 16 }}>
        Przejdź do Dzisiaj
      </Link>
    </Screen>
  );
}
