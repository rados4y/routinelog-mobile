# RoutineLog

Mobilny dziennik rutyn na Androida: plan dnia, elastyczne cele tygodniowe,
zarządzanie rutynami, historia i statystyki. Pierwsza wersja działa lokalnie,
bez konta i backendu. Interfejs jest po polsku.

**Current runtime: Expo Go compatible**

## Stack i wybór SDK

React Native 0.86, React 19, Expo SDK 57, Expo Router, TypeScript strict,
Zustand, AsyncStorage, Zod, Vitest, ESLint i Prettier. Brak własnego kodu native.
`expo-dev-client` przygotowuje opcjonalny development build; nie jest wymagany do Expo Go.

Dokumentację sprawdzono 25.10.2026. SDK 58 jest stabilne, ale w okresie przejściowym
Expo zaleca SDK 57 dla Expo Go na fizycznym urządzeniu. Dlatego projekt używa SDK 57,
zależności zgodnych z jego `bundledNativeModules` i zablokowanego `package-lock.json`.
Aktualizacja SDK wymaga ponownego sprawdzenia zgodności Expo Go i nowego runtime.

Źródła: [tworzenie projektu](https://docs.expo.dev/get-started/create-a-project/),
[Expo Go i development builds](https://docs.expo.dev/develop/development-builds/introduction/),
[EAS Build](https://docs.expo.dev/build/introduction/),
[EAS Update](https://docs.expo.dev/eas-update/getting-started/),
[runtime versions](https://docs.expo.dev/eas-update/runtime-versions/),
[fingerprint](https://docs.expo.dev/versions/v57.0.0/sdk/updates/),
[kanały i branche](https://docs.expo.dev/eas-update/how-it-works/).

## Funkcje

- Dzisiaj: siedem dat wokół bieżącego dnia, podsumowanie, pierścień i pasek postępu.
- Plan: emoji, kategoria, godzina, harmonogram, notatka; wykonaj, pomiń, cofnij.
- Rutyny: dodawanie, edycja, włączanie/wyłączanie i usuwanie z potwierdzeniem.
- Harmonogramy: codziennie, Pn–Pt, wybrane dni, 3×/tydzień, raz/tydzień, co N dni,
  skróty co 7 i co 30 dni. Dzień początkowy interwału jest edytowalny.
- Historia: zapisane wyniki oraz wyliczone niewykonania, źródło, data i czas wykonania.
- Statystyki: ostatnie siedem dni, wykonania/pominięcia/niewykonania, regularność, wykres.
- Seed pięciu rutyn tylko przy pierwszym uruchomieniu. Błędy odczytu nie kasują danych.
- Loading/error/empty states, granica błędów Routera, podstawowa dostępność.

Godzina rutyny porządkuje plan; ta wersja **nie wysyła powiadomień**.
Dane są na jednym urządzeniu. Odinstalowanie aplikacji lub wyczyszczenie jej danych je usuwa.

## Architektura

```text
app/                        Expo Router, stack i cztery zakładki
src/components/             wspólne elementy UI
src/features/today/         plan dnia i akcje
src/features/routines/      lista i edytor
src/features/history/       historia
src/features/insights/      statystyki
src/domain/                 modele, daty, harmonogramy, historia, statystyki
src/data/                   repozytoria, wersjonowany zapis i seed
src/store/                  operacje domenowe i adapter Zustand
src/theme/                  paleta i wspólne style
src/utils/                  zegar odświeżany także po powrocie do aplikacji
scripts/                    powiązanie EAS, sprawdzenie runtime i bramki deploymentu
.github/workflows/          checks, OTA, konfiguracja EAS, ręczny native build
```

UI wywołuje operacje store'a; nie odczytuje AsyncStorage. `RoutineRepository` i
`LogRepository` mają metody `list/save/remove`, a adapter pamięci ma jawny interfejs.
Każda encja ma osobny klucz i kopertę `{version: 1, data}` z walidacją Zod.
Seed ma osobny znacznik i odzyskuje częściowy zapis bez duplikowania ani nadpisywania rekordów.
Nowy format wymaga jawnej migracji; nieznane wersje wyświetlają błąd zamiast resetować dane.

`createRoutineStore` przyjmuje repozytoria, zegar i generator identyfikatorów.
Zapis jest potwierdzany przed zmianą stanu UI; podczas zapisu kolejne operacje są blokowane.
Wybrana data i formularz pozostają stanem UI, niezależnym od danych domenowych.

### Model danych

`Routine`: `id`, `name`, `icon`, `category`, `active`, `schedule`, `target`, `unit`,
`reminderTime`, `note`, `createdAt`, `updatedAt`. Dodatkowo `effectiveFrom`,
`revisions` i `deletedAt` zachowują harmonogram i aktywność wcześniejszych dni.
Zmiana działa od lokalnego dnia edycji; zmiany w tym samym dniu zastępują jego plan.
Usuwanie jest miękkie, aby zachować historię.

`RoutineLog`: `id`, `routineId`, `scheduledFor`, `status`, `completedAt`, `value`,
`note`, `source`, `createdAt`, `updatedAt`; kopia nazwy i ikony zachowuje czytelność historii.
`scheduledFor` to lokalna data kalendarzowa `YYYY-MM-DD`; znaczniki czasu są ISO UTC.
Źródła: `app`, `chatgpt`, `automation`. Jedna rutyna ma jeden jawny wynik na dzień.
Pola `value`, `unit` i `target` są przygotowane do późniejszych celów ilościowych.

### Harmonogramy i niewykonania

Silnik w `src/domain/schedule` to czyste funkcje. `Schedule` jest unią dyskryminowaną:
`daily`, `weekdays`, `interval`, `weeklyTarget`. Nowe rodzaje okien/cykli należy
rozszerzać tutaj, wraz z walidacją i testami, zamiast dodawać warunki do ekranów.

- `pending`: zaplanowane, bez decyzji, niezakończony termin.
- `overdue`: osobna flaga dla dzisiejszej rutyny ze stałym terminem po jej godzinie.
- `missed`: zakończony wcześniejszy dzień, w którym rutyna była aktywna i zaplanowana,
  bez `done/skipped`.
- Cel tygodniowy nie ma dziennego `missed` ani `overdue`. Tydzień trwa Pn–Nd.
  Po jego zakończeniu historia wylicza jeden wpis na niedzielę z liczbą brakujących wykonań.
  Edycja celu w trakcie tygodnia stosuje cel obowiązujący na koniec okna.
- Niewykonania wyliczamy, nie utrwalamy: późniejsze oznaczenie zakończonego dnia
  automatycznie poprawia historię i statystyki.
- Rutyny nie istnieją przed datą utworzenia; pauza i edycja nie przepisują wcześniejszych dni.
- Kalendarz używa arytmetyki dat odpornej na zmianę czasu; bez dzielenia lokalnych timestampów przez 24h.

Regularność = wykonane / (wykonane + pominięte + niewykonane + dzisiejsze oczekujące
ze stałym terminem). Braki tygodniowe liczą niewykonane jednostki celu.
Wykres przypisuje wykonania do `scheduledFor`. Statystyki są funkcją z parametrem
liczby dni; kolejne zakresy i agregacje nie wymagają zmiany warstwy zapisu.

### Dalszy backend

Adapter `SupabaseRoutineRepository`/`SupabaseLogRepository` może zastąpić lokalny zapis
przy inicjalizacji store'a. UI pozostaje niezależne od dostawcy. Synchronizacja będzie
wymagała migracji identyfikatorów, konfliktów, tombstone'ów i kont; nie jest jeszcze wdrożona.
Przyszłe API/MCP może używać tych samych modeli i operacji: `get_today`, `get_overdue`,
`create_routine`, `update_routine`, `pause_routine`, `complete_routine`, `skip_routine`,
`undo_completion`, `get_history`, `get_stats`. Ten etap nie zawiera backendu ani MCP.

## Development i testy

Dla narzędzi developerskich: Node 22 LTS, npm i lockfile.

```sh
npm ci
npm start
npm run check
npm run export:android
```

Osobne kontrole: `npm run typecheck`, `npm run lint`, `npm test`,
`npm run format:check`. `npm run format` formatuje pliki.

Testy obejmują daty i interwały, plan wybranej daty, procent realizacji,
cele tygodniowe i granice okien, pending/overdue/missed, statystyki siedmiu dni,
repozytoria, seed, błędy zapisu, CRUD, done/skipped/undo i ponowne wczytanie.
Brak snapshotów całych ekranów.

`npm run test:e2e` sprawdza w Chromium interfejs 393×851: done/skipped/undo, historię,
statystyki, dodawanie/edycję/usuwanie, włączanie/wyłączanie i zapis po odświeżeniu.
Wymaga wcześniejszego `npx expo export --platform web` i przeglądarki Playwright.
CI instaluje przeglądarkę i wykonuje te kroki automatycznie; raport błędu jest artefaktem.
To test wersji web tej samej aplikacji React Native, nie zastępuje testu na fizycznym Androidzie.

### Android i Expo Go

Użytkownik telefonu nie musi wykonywać komend. Codex uruchamia serwer Expo z tunelem
w dostępnym środowisku i podaje link otwierany w Expo Go. Serwer musi pozostawać uruchomiony;
adres localhost lub adres prywatny środowiska nie działa na telefonie poza tą siecią.
Instalacja Expo Go ze sklepu i otwarcie otrzymanego linku to czynności użytkownika.

Expo Go jest środowiskiem developerskim, nie własną zainstalowaną aplikacją.
Nie należy obiecywać trwałego linku produkcyjnego ani automatycznych aktualizacji
z kanału zainstalowanej aplikacji w Expo Go. Dla niezależnego od serwera testowania OTA
przeznaczony jest opcjonalny preview APK; development client pozwala wybierać aktualizacje
z jego launchera. Nie budujemy APK dla zwykłych zmian JS.

## Expo / EAS bez terminala użytkownika

Jedyny sekret obecnego etapu: **EXPO_TOKEN** w GitHub → Settings → Secrets and variables → Actions.
Nie umieszczaj tokenu w plikach, issue, PR ani rozmowie. Publiczny identyfikator EAS zapisuje
`eas-project.json`; opcjonalny override `EXPO_PUBLIC_EAS_PROJECT_ID` jest publiczny.
`.env.example` nie zawiera sekretów, `.env*` są ignorowane.

Po dodaniu tokenu Codex uruchamia workflow **Link Expo project** (lub `npm run eas:setup`
w autoryzowanym środowisku). Workflow tworzy/powiązuje projekt na koncie tokenu, przygotowuje
kanały i zapisuje publiczny identyfikator w repo. Nie trzeba ręcznie tworzyć projektu EAS.
Błąd autoryzacji konta lub limit konta wymaga rozwiązania konkretnej blokady przed kontynuacją.

### Profile i kanały

| Profil      | Android                 | Dystrybucja | Kanał / środowisko |
| ----------- | ----------------------- | ----------- | ------------------ |
| development | APK, development client | internal    | development        |
| preview     | APK, release            | internal    | preview            |
| production  | AAB                     | sklep       | production         |

Kanały wskazują branche EAS o tych samych nazwach. Git branch developerski publikuje na
`development`, PR z tego repo na `preview`, `main` na `production`.
EAS branch i Git branch są odrębnymi pojęciami. Wspólny preview oznacza, że ostatni
pomyślny PR zastępuje poprzedni podgląd; każda publikacja zawiera SHA w wiadomości.
Forki nie otrzymują sekretów ani deploymentu.

`app.config.ts` włącza `expo-updates`, `updates.url` i `runtimeVersion: {policy: 'fingerprint'}`
dopiero po powiązaniu projektu. Fingerprint oblicza zgodność native podczas buildów i OTA.
Publikacje podają jawnie `--environment`, zgodnie z wymaganiem SDK 55+.

### GitHub Actions

- **CI and EAS Update**: push, PR i ręczne uruchomienie; `npm ci`, typecheck, lint,
  testy, format, zgodność wersji Expo, config i eksport Androida.
- Brak `EXPO_TOKEN` lub projektu: testy pozostają zielone; job aktualizacji jest skipped,
  a podsumowanie wyjaśnia powód.
- Po testach sprawdzany jest fingerprint bieżącego Android runtime i lista zakończonych
  buildów odpowiedniego profilu (ostatnich 50). OTA następuje tylko przy zgodnym runtime.
- Brak zgodnego buildu: OTA jest pominięte z komunikatem o potrzebie native build.
  **Nie uruchamia automatycznie płatnego lub zbędnego buildu**.
- **Android native build**: `workflow_dispatch`, profil wybrany przez Codex; pełne checks
  przed buildem i oczekiwanie na wynik EAS. Podpis Androida musi być już skonfigurowany;
  jeżeli non-interactive nie może utworzyć klucza, Codex konfiguruje go w sesji EAS.
- **Link Expo project**: jednorazowa konfiguracja po udostępnieniu tokenu.
  Commit wykonany tokenem GitHub Actions nie wyzwala kolejnego workflow, dlatego setup
  sam uruchamia kontrole i eksport po powiązaniu projektu.

### Kiedy potrzebny jest nowy APK

Pierwsza instalacja własnej aplikacji oraz zmiana fingerprint native: SDK, natywne
zależności, pluginy, uprawnienia, Android config lub inne składniki runtime.
Zmiana tekstu, stylów, ekranów i czystej logiki JS/TS zwykle wymaga tylko EAS Update.
Zmiany zależności zawsze wymagają sprawdzenia fingerprint zamiast zgadywania.
AAB production nie jest plikiem do bezpośredniej instalacji na telefonie.

Development APK instaluje się ponownie tylko po zmianie runtime. Aktualizacje w development
client otwiera się z launchera/Extensions. Preview APK pobiera zgodne OTA przy starcie;
zwykle wystarczy zamknąć i otworzyć aplikację dwa razy. Preview jest prostsze do testów
bez komputera i bez stale działającego Metro.

## Dalsze zadania przez Codex

Polecenie tekstowe → odczyt aktualnego main i AGENTS.md → branch `feat/`, `fix/` lub
`chore/` → zmiany → kontrole i naprawy → commit/push → PR → sprawdzenie GitHub Actions
→ zgodne OTA, a przy zmianie runtime właściwy build. Nie kończyć ze znanym naprawialnym
czerwonym CI. Nie publikować po nieudanych kontrolach. Nie wymagać ręcznej edycji
plików ani komend od użytkownika telefonu.

Dodawanie ustawień, konta, logowania, integracji i powiadomień powinno używać nowych
tras stacka/feature folders bez przebudowy istniejących zakładek. Przy integracjach
sekrety serwera należą wyłącznie do GitHub/EAS Secrets lub backendu.
