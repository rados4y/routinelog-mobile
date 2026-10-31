# RoutineLog — zasady pracy agenta

Użytkownik pracuje wyłącznie z telefonu, poleceniami tekstowymi.
Wykonuj techniczne kroki samodzielnie; nie dawaj kodu do kopiowania ani komend użytkownikowi.

- Zaczynaj od sprawdzenia repo, main i bieżącego diffu. Zachowuj cudze zmiany.
- Używaj branchy feat/, fix/, chore/ i logicznych commitów. Push oraz PR są częścią zadania.
- Przed commitem/deployem: npm ci (po zmianach lockfile), npm run check,
  npx expo install --check, npx expo config --type public, npm run export:android.
- Po pushu odczytaj Actions. Napraw czerwone checks i poczekaj na wynik.
- Nie publikuj OTA ani buildu po nieudanych testach, lint lub typecheck.
- Sprawdzaj dokumentację Expo przed zmianą SDK, native konfiguracji lub EAS workflow.
- Obecnie SDK 57 dla Expo Go na fizycznym Androidzie; README wyjaśnia okres przejściowy.
- EAS Update wyłącznie do zgodnego fingerprint runtime. Skrypt check-runtime to bramka.
- Native build tylko dla pierwszej instalacji lub zmiany runtime, przez workflow dispatch.
- Brak EXPO_TOKEN nie może psuć zwykłego CI. Po dodaniu tokenu uruchom Link Expo project.
- Nigdy nie wypisuj ani nie commituj sekretów. EXPO_TOKEN tylko GitHub/EAS/zarządzane środowisko.
- Czysta domena w src/domain; UI nie używa AsyncStorage bezpośrednio.
- Zachowuj historię, lokalne daty i rozróżnienie pending/overdue/missed.
- Cele elastyczne rozliczaj po zamknięciu okna tygodniowego.
- Testuj logikę i istotne przepływy; bez testów kopiujących JSX i zbędnych snapshotów.
- Aktualizuj README przy zmianach workflow, runtime, modeli lub architektury.
- Końcowy komunikat krótki: wynik, commit/PR, testy/CI, deploy i jedna konkretna
  czynność telefonu tylko jeśli jest konieczna. Nie oznaczaj testów na urządzeniu jako
  zakończonych bez rzeczywistej weryfikacji.
