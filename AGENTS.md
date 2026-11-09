# RoutineLog — zasady pracy agenta

Użytkownik pracuje wyłącznie z telefonu, poleceniami tekstowymi.
Wykonuj techniczne kroki samodzielnie; nie dawaj kodu do kopiowania ani komend użytkownikowi.

- Zaczynaj od sprawdzenia repo, main i bieżącego diffu. Zachowuj cudze zmiany.
- Używaj branchy feat/, fix/, chore/ i logicznych commitów. Push oraz PR są częścią zadania.
- Przed commitem/deployem: npm ci (po zmianach lockfile), npm run check,
  EXPO_OFFLINE=1 npx expo install --check (mapa wersji z zainstalowanego SDK), npx expo config --type public, npm run export:android.
- Po pushu odczytaj Actions. Napraw czerwone checks i poczekaj na wynik.
- Nie publikuj OTA ani buildu po nieudanych testach, lint lub typecheck.
- Sprawdzaj dokumentację Expo przed zmianą SDK, native konfiguracji lub EAS workflow.
- Obecnie SDK 57. Ekrany działają w Expo Go; widget Android wymaga APK 1.2.0 (versionCode 3) lub nowszego.
- Zachowuj rejestrację widgetu przed Expo Router w index.ts oraz osłony importów native dla Expo Go/web. Widget używa tego samego store/repozytoriów; nigdy nie omijaj walidacji checklisty.
- Pliki bridge.tsx i bridge.android.tsx muszą mieć to samo rozszerzenie. Metro wybiera rozszerzenie przed wariantem platformy; bridge.ts przesłania bridge.android.tsx. CI eksportuje Android z --source-maps i uruchamia node scripts/check-widget-bundle.mjs, aby odrzucić taki błąd. Sprawdź to również przed commitem zmian widgetu.
- Kliknięcia widgetu muszą sprawdzać dzisiejszą datę i wyświetlony status; stare kliknięcia tylko odświeżają widok.
- Strzałki jasnego widgetu przeglądają daty osobno dla każdej instancji. Poza dzisiaj widok jest tylko do odczytu; wybór wraca do dzisiaj po lokalnej północy. Nie mieszaj preferencji widgetu z repozytoriami rutyn/logów.
- EAS Update wyłącznie do zgodnego fingerprint runtime. Skrypt check-runtime to bramka.
- Native build tylko dla pierwszej instalacji lub zmiany runtime, przez workflow dispatch.
- Brak EXPO_TOKEN nie może psuć zwykłego CI. Po dodaniu tokenu uruchom Link Expo project.
- Nigdy nie wypisuj ani nie commituj sekretów. EXPO_TOKEN tylko GitHub/EAS/zarządzane środowisko.
- Czysta domena w src/domain; UI nie używa AsyncStorage bezpośrednio.
- Notion v2: definicje w bazie Routines, stabilne Routine ID, zakres start/end i checklisty w obie strony. Miesięczne kolumny są projekcją; ich usunięcie nigdy nie usuwa rutyny. Zachowuj archiwalne kolumny, tombstone Archived i jednorazową migrację. Nigdy nie przenoś ponownie starych ustawień miesięcznych po Migration: complete.
- Widget wypełnia całą wysokość launchera. Nawigacja zmienia tylko jedną instancję jednym renderem; status odświeża pozostałe bez powtarzania tego samego. Nie zmieniaj natywnej biblioteki bez omówienia złożoności z użytkownikiem.
- Dzienne notatki są osobnymi rekordami po dacie. Zachowuj puste rekordy jako tombstone, kolejkę zapisów i niezapisane drafty. Kolumna Notion z markerem RoutineLog daily notes (v1) nie jest rutyną; scalaj notatki trójstronnie i nigdy nie nadpisuj edytowanego draftu z synchronizacji.
- Zachowuj historię, lokalne daty i rozróżnienie pending/overdue/missed.
- Cele elastyczne rozliczaj po zamknięciu okna tygodniowego.
- Testuj logikę i istotne przepływy; bez testów kopiujących JSX i zbędnych snapshotów.
- Przy zmianach ekranów/logiki aktualizuj zwięzły katalog src/features/changeRequests/catalog.ts, zachowuj stabilne ID sekcji i uruchom npm run guide:build. Nie edytuj ręcznie generated/guide.ts ani docs/change-requests/index.html; CI sprawdza ich aktualność. Guide jest lokalnym HTML w WebView, draft jest osobnym rekordem UI i nie synchronizuje się z Notion.
- Aktualizuj README przy zmianach workflow, runtime, modeli lub architektury.
- Końcowy komunikat krótki: wynik, commit/PR, testy/CI, deploy i jedna konkretna
  czynność telefonu tylko jeśli jest konieczna. Nie oznaczaj testów na urządzeniu jako
  zakończonych bez rzeczywistej weryfikacji.
