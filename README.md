# RoutineLog

Mobilny dziennik rutyn na Androida: plan dnia, elastyczne cele tygodniowe,
zarządzanie rutynami, historia i statystyki. Dane działają lokalnie, z opcjonalną
dwukierunkową synchronizacją z Notion. The application interface is in English. User-authored routine names and notes are preserved.

**Current runtime: Android build with home-screen widget; core screens remain Expo Go compatible**

## Product overview for change requests

Concise screen names, section IDs and behavior: [PDF deck](docs/product-overview.pdf),
[editable PowerPoint](docs/product-overview.pptx), [Markdown reference](docs/product-overview.md).
For example: “On Today · T5, add a word count below the daily note.”

[App icon concepts A–D](docs/design/icon-options.md): selected **C · Small steps**,
applied in Android **1.3.0 / versionCode 4**. This launcher resource change requires
one new preview APK; later compatible JavaScript changes continue through OTA.

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

- Dzisiaj: ciemny, zwarty plan z różowym akcentem, siedmioma datami, wyszukiwaniem,
  filtrem kategorii i kalendarzem. Przycisk statusu cyklicznie zmienia: bez oznaczenia → wykonane → niewykonane → pominięte → bez oznaczenia;
  dotknięcie nazwy rozwija harmonogram, notatkę, pominięcie i edycję.
- Rutyny: karty z tygodniowym paskiem dni, kolorową ikoną kategorii, kalendarzem,
  rzeczywistą regularnością i serią ostatnich 30 dni. Menu pozwala edytować, wyłączyć
  lub usunąć rutynę z potwierdzeniem. FAB tworzy rutynę z obu głównych ekranów.
- Pełnoekranowy wybór częstotliwości: codziennie, dni tygodnia, dni miesiąca 1–31
  i „Ostatni”, ordinalne dni tygodnia w miesiącu, daty roczne, cele N×/tydzień
  lub N×/miesiąc, co N dni. Anulowanie nie zmienia zapisanego harmonogramu.
- Dotknięcie daty w karcie rutyny lub jej kalendarzu używa tego samego cyklu.
  Główny kalendarz ekranu Dzisiaj nadal służy do wyboru dnia. Kalendarze rutyn
  pozwalają ręcznie uzupełnić dzisiaj i wcześniejsze dni także poza harmonogramem
  lub sprzed importu rutyny. Nie zmienia to daty startu ani automatycznych terminów.
  Wybranie przyszłej daty pokazuje wyjaśnienie i blokuje zapis. Puste oznaczenie wcześniejszego dnia
  nadal może być wyliczane jako niewykonanie w historii.
- Opcjonalna lista kroków w edytorze (do 30 pozycji): wykonanie otwiera panel,
  w którym należy zaznaczyć wszystkie kroki. Anulowanie nie zmienia wyniku,
  a niezapisane zaznaczenia nie są zachowywane. Każde kolejne wykonanie wymaga
  nowego potwierdzenia. Historia zachowuje kopię potwierdzonych tekstów kroków.
- Notatki: edycja bezpośrednio pod rutynami wybranego dnia, autosave i lista dat w zakładce Notes. Historia wyników pozostaje zachowana pod dotychczasową trasą `/history`, poza główną nawigacją.
  Edytor przewija aktywne pole ponad klawiaturę (również w panelu Notes), z przewijaniem długiego tekstu wewnątrz pola. Ikona notatki oznacza dni z treścią w pasku dat Today i kalendarzach; reaguje także na niezapisany tekst i znika po wyczyszczeniu notatki. Znacznik dzisiejszego dnia i statusy rutyn pozostają osobne.
  Widget wyświetla krótki podgląd zapisanej notatki wybranego dnia, z przewijaniem listy przy małym rozmiarze. Dotknięcie notatki otwiera Today na odpowiedniej dacie, przewija i ustawia kursor w edytorze. Dotknięcie nazwy rutyny rozwija jej szczegóły w aplikacji bez zmiany statusu; osobny obszar ikony statusu nadal działa bezpośrednio w widgecie (checklista wymaga potwierdzenia w aplikacji). Zapisy notatek, w tym z Notion, odświeżają widget.
- Statystyki: ostatnie siedem dni, wykonania/pominięcia/niewykonania, regularność, wykres.
- Pięć rutyn z referencji: niedzielna książka, rozmowy z Pawłem (ostatni dzień),
  Piotrkiem (15.), rodzicami (15. i ostatni) oraz spacer z psem (1×/tydzień).
  Jednorazowa migracja zastępuje poprzedni aktywny zestaw, zachowując historię.
  Kolejne uruchomienia nie nadpisują zmian użytkownika.
- Loading/error/empty states, granica błędów Routera, podstawowa dostępność.
- Notion: miesięczne tabele z dniami w wierszach i rutynami w kolumnach;
  synchronizacja nazw, opisów, ustawień i statusów w obie strony.

Godzina rutyny porządkuje plan; ta wersja **nie wysyła powiadomień**.
Odinstalowanie aplikacji lub wyczyszczenie jej danych usuwa lokalny zapis.
Instaluj aktualizację APK na istniejącą aplikację, bez jej odinstalowywania.

## Architektura

```text
app/                        Expo Router, stack i cztery zakładki
src/components/             wspólne elementy UI
src/features/today/         plan dnia i akcje
src/features/routines/      lista i edytor
src/features/notes/          dzienne notatki, edycja inline i lista dat
src/features/history/       historia
src/features/insights/      statystyki
src/domain/                 modele, daty, harmonogramy, historia, statystyki
src/data/                   repozytoria, wersjonowany zapis i seed
src/store/                  operacje domenowe i adapter Zustand
src/integrations/notion/     adapter API, synchronizacja i bezpieczne poświadczenia
src/theme/                  paleta i wspólne style
src/utils/                  zegar odświeżany także po powrocie do aplikacji
scripts/                    powiązanie EAS, sprawdzenie runtime i bramki deploymentu
.github/workflows/          checks, OTA, konfiguracja EAS, ręczny native build
```

UI wywołuje operacje store'a; nie odczytuje AsyncStorage. `RoutineRepository` i
`LogRepository` mają metody `list/save/remove`, a adapter pamięci ma jawny interfejs.
Każda encja ma osobny klucz i kopertę `{version: 1, data}` z walidacją Zod.
Seed ma osobny znacznik i odzyskuje częściowy zapis bez duplikowania ani nadpisywania rekordów.
`@routinelog/seed-version = 2` oznacza zastosowany zestaw z referencji. Przejście z
wersji 1 archiwizuje dotychczasowe rutyny (również własne, zgodnie z prośbą właściciela),
zachowuje logi i rewizje, a następnie dodaje pięć nowych, stabilnych identyfikatorów.
Zapis znacznika następuje dopiero po zakończeniu; ponowienie odzyskuje przerwany import.
Rozmowy z Pawłem i rodzicami zaczynają się od zaległego ostatniego dnia poprzedniego
miesiąca, aby odtworzyć plan z referencji. Nie importujemy przykładowych wykonań,
serii ani procentów. Nowe rutyny synchronizują się z istniejącym połączeniem Notion.
Nowy format wymaga jawnej migracji; nieznane wersje wyświetlają błąd zamiast resetować dane.

`createRoutineStore` przyjmuje repozytoria, zegar i generator identyfikatorów.
Zapis jest potwierdzany przed zmianą stanu UI; podczas zapisu kolejne operacje są blokowane.
Wybrana data i formularz pozostają stanem UI, niezależnym od danych domenowych.
`src/domain/entry` rozdziela ręczny zapis kalendarza od automatycznego harmonogramu.
Jawne logi sprzed importu pozostają widoczne i edytowalne bez tworzenia zaległości.
Historia i statystyki filtrują współdzielone logi po identyfikatorach wybranych rutyn.

### Model danych

`Routine`: `id`, `name`, `icon`, `category`, `active`, `schedule`, `target`, `unit`,
`reminderTime`, `note`, opcjonalne `checklist: {id, text}[]`, `createdAt`, `updatedAt`. Dodatkowo `effectiveFrom`,
`revisions` i `deletedAt` zachowują harmonogram i aktywność wcześniejszych dni.
Zmiana działa od lokalnego dnia edycji; zmiany w tym samym dniu zastępują jego plan.
Usuwanie jest miękkie, aby zachować historię.
Opcjonalny `sortOrder` zachowuje kolejność kart niezależnie od kolejności kluczy
AsyncStorage. To lokalna kolejność prezentacji, nie część edytowalnych pól Notion.

`RoutineLog`: `id`, `routineId`, `scheduledFor`, `status`, `completedAt`, `value`,
`note`, `source`, `createdAt`, `updatedAt`; kopia nazwy i ikony zachowuje czytelność historii.
`scheduledFor` to lokalna data kalendarzowa `YYYY-MM-DD`; znaczniki czasu są ISO UTC.
Źródła: `app`, `chatgpt`, `automation`, `notion`. Jedna rutyna ma jeden jawny wynik na dzień.
Opcjonalne `RoutineLog.checklist: {id, text, checked}[]` przechowuje potwierdzone
kroki z chwili wykonania. Edycja listy nie zmienia wcześniejszych potwierdzeń.
Store i domena odrzucają wykonania z niepełną, powieloną lub nieaktualną listą.
Starsze wykonania bez listy pozostają poprawne.
Pola `value`, `unit` i `target` są przygotowane do późniejszych celów ilościowych.

### Harmonogramy i niewykonania

Silnik w `src/domain/schedule` to czyste funkcje. `Schedule` jest unią dyskryminowaną:
`daily`, `weekdays`, `interval`, `weeklyTarget`, `monthlyTarget`, `monthlyDays`,
`monthlyWeekdays`, `yearlyDates`. Moduł `schedule/windows` centralizuje daty i okna.
Nowe rodzaje okien/cykli należy
rozszerzać tutaj, wraz z walidacją i testami, zamiast dodawać warunki do ekranów.

- `pending`: zaplanowane, bez decyzji, niezakończony termin.
- `overdue`: osobna flaga dla dzisiejszej rutyny ze stałym terminem po jej godzinie.
- `missed`: zakończony wcześniejszy dzień, w którym rutyna była aktywna i zaplanowana,
  bez `done/skipped`.
- Cel tygodniowy nie ma automatycznego dziennego `missed` ani `overdue`. Tydzień trwa Pn–Nd.
  Po jego zakończeniu historia wylicza jeden wpis na niedzielę z liczbą brakujących wykonań.
  Edycja celu w trakcie tygodnia stosuje cel obowiązujący na koniec okna.
- Cel miesięczny rozliczamy na koniec miesiąca. Terminy elastyczne (dni tygodnia,
  miesiąca i roku) są widoczne od terminu do wykonania lub pominięcia, najpóźniej
  do następnego terminu. Dopiero zamknięcie okna może wyliczyć jedno niewykonanie.
  Nie tworzymy zaległego okna sprzed początkowej daty harmonogramu; otwarte cele
  tygodniowe/miesięczne mogą zacząć się w trakcie okresu. Kalendarz pozwala uzupełnić
  wcześniejsze wykonania także po zamknięciu okna.
- Dzień 31 nie jest automatycznie przesuwany na 30. lub 28.; temu służy osobna
  opcja „Ostatni”. Data 29 lutego jest obsługiwana również w planie rocznym.
- Automatyczne niewykonania są wyliczane; późniejsze oznaczenie zakończonego dnia
  poprawia historię i statystyki. Ręczne `missed` z cyklu statusów jest trwałym
  wpisem, także dla dzisiaj. Braki zamkniętego celu uwzględniają już zapisane
  niewykonania, aby nie liczyć ich podwójnie.
- Rutyny nie istnieją przed datą utworzenia; pauza i edycja nie przepisują wcześniejszych dni.
- Kalendarz używa arytmetyki dat odpornej na zmianę czasu; bez dzielenia lokalnych timestampów przez 24h.

Regularność = wykonane / (wykonane + pominięte + niewykonane + dzisiejsze oczekujące
ze stałym terminem). Braki tygodniowe liczą niewykonane jednostki celu.
Wykres przypisuje wykonania do `scheduledFor`. Statystyki są funkcją z parametrem
liczby dni; kolejne zakresy i agregacje nie wymagają zmiany warstwy zapisu.

### Dalszy backend

Adapter `SupabaseRoutineRepository`/`SupabaseLogRepository` może zastąpić lokalny zapis
przy inicjalizacji store'a. UI pozostaje niezależne od dostawcy. Synchronizacja z przyszłym
backendem wymaga osobnego protokołu kont, konfliktów i tombstone'ów. Adapter Notion
działa niezależnie od lokalnych repozytoriów, przez porównanie trzech wersji.
Przyszłe API/MCP może używać tych samych modeli i operacji: `get_today`, `get_overdue`,
`create_routine`, `update_routine`, `pause_routine`, `complete_routine`, `skip_routine`,
`undo_completion`, `get_history`, `get_stats`. Ten etap nie zawiera backendu ani MCP.

## Synchronizacja z Notion

Strona [RoutineLog](https://www.notion.so/40beab5cb7ea81449829c988a35f285b)
zawiera podstrony `YYYY-MM · nazwa miesiąca`, a w każdej jest tabela `YYYY-MM`.
Każdy dzień miesiąca ma jeden wiersz (`Dzień`, `Data`); pozostałe edytowalne kolumny
typu select, checkbox lub tekst reprezentują rutyny. Pozostaw kolumnę daty `Data`.
Publiczny identyfikator strony jest w `notion-project.json`; nie jest poświadczeniem.

W aplikacji przycisk **N** na ekranie Dzisiaj/Rutyny otwiera połączenie. Użytkownik
tworzy **osobisty token Notion** z uprawnieniem **Notion API** w
[Developer portal → Personal access tokens](https://www.notion.so/developers/tokens),
dla konta i workspace ze stroną RoutineLog, i wkleja go wyłącznie w aplikacji.
Uprawnienia Notion w ChatGPT nie przenoszą się do zainstalowanej aplikacji.
PAT działa z uprawnieniami swojego właściciela; przy jego wygaśnięciu trzeba go odnowić.
Własna integracja wewnętrzna również działa, jeśli ma dostęp do strony i odczyt/zapis treści.

Token trafia do `expo-secure-store` (Android Keystore), a nie do AsyncStorage,
repozytorium, logów, `EXPO_PUBLIC_*` ani GitHub Secrets. Nie ma wspólnego sekretu
zaszytego w aplikacji. Wersja web nie zapisuje tokenów i nie wykonuje połączenia
do Notion; dostępny jest ekran informacyjny. Dla aplikacji udostępnianej wielu
użytkownikom należy zastąpić osobisty PAT publiczną integracją OAuth z backendem.

- Dodanie kolumny w bieżącym miesiącu tworzy rutynę (domyślnie codzienną o 08:00).
  Nazwa może zaczynać się od emoji. Zmiana nazwy zachowuje tożsamość rutyny, bo
  połączenie używa stabilnego ID kolumny, a nie samej nazwy.
- Opis kolumny zawiera notatkę oraz czytelne pola `Kategoria`, `Godzina`, `Plan`,
  `Aktywna`, `Cel`, `Jednostka` i link otwierający rutynę w aplikacji. Plany:
  `codziennie`, `dni 1,3,5` (Pn=1), `3x/tydzień`, `co 7 dni od 2026-11-01`.
  Dodatkowo: `miesiąc 15,ostatni elastycznie`, `tygodnie ostatni dni 1 elastycznie`,
  `rok 29.2,2.11` i `4x/miesiąc`. Flaga `elastycznie` jest zachowywana w obie strony.
  Pól i linku nie trzeba ręcznie dodawać: synchronizacja je uzupełnia.
  API Notion ogranicza opis kolumny do 280 znaków łącznie z ustawieniami.
  Zbyt długi opis jest zgłaszany przed wysłaniem żądania; notatki nie są automatycznie
  obcinane ani usuwane. Przy zapisie opisu adapter podaje istniejący typ kolumny
  z pustymi ustawieniami, co zachowuje opcje select i zapisane wartości.
- Select ma opcje `Wykonane`, `Pominięte`, `Niewykonane`; puste pole cofa oznaczenie.
  Tekst akceptuje też `x`, `✓`, `done`, `skip`, `missed`. Nieznane wartości zatrzymują
  synchronizację zamiast być traktowane jako cofnięcie. Checkbox przenosi done/undo;
  pominięcia pozostają lokalne, dopóki kolumna jest checkboxem.
- Usunięcie znanej kolumny w bieżącym miesiącu miękko usuwa rutynę z planu.
  Usunięcie rutyny w aplikacji usuwa jej kolumnę tylko z bieżącego miesiąca.
  Starsze tabele i zapisane logi pozostają archiwum. Zmiana statusu w archiwum
  nadal działa w obie strony. Brak wiersza dnia zostaje naprawiony z lokalnych wpisów.
  Przed usunięciem kolumn silnik najpierw uzgadnia ich wpisy, aby zachować również
  wykonania istniejące tylko w Notion. Usunięcia są osobnym żądaniem, co pozwala
  zastąpić rutynę nową o tej samej nazwie, zachowując odrębne historie.
- Nowy miesiąc powstaje przy pierwszej synchronizacji w tym miesiącu. Przy przejściu
  silnik najpierw odczytuje ostatnią tabelę, a potem tworzy nową bez zmiany archiwum.
  Edycje nazw/ustawień w starszych miesiącach nie zmieniają już bieżących rutyn.
- Lokalny, walidowany ledger porównuje bazową, lokalną i zdalną wersję każdego
  pola/statusu. Pozwala przenieść cofnięcie także po pracy offline i restarcie.
  Równoległe zmiany różnych pól są łączone; rozbieżność tego samego pola wymaga
  wyboru **Zachowaj wersję z aplikacji / z Notion** na ekranie połączenia.
  Usunięcie znanej kolumny wygrywa ze zmianą jej ustawień w telefonie.
- Błędy sieci, brak uprawnień, niepełna paginacja i nieznane typy danych nie są
  interpretowane jako usunięcie. Zapisy do API nie są automatycznie ponawiane po
  niejednoznacznym błędzie: kolejna synchronizacja najpierw odczytuje stan Notion.
  Lokalne edycje podczas żądania sieciowego chroni compare-and-save w store.
- Synchronizacja działa po otwarciu, po lokalnym zapisie i co minutę na pierwszym
  planie. Po zamknięciu procesu nie działa. Ręczny przycisk ponawia ją po błędzie.
  Nie jest to mechanizm powiadomień ani działanie w tle Androida.
- Listy kroków i ich potwierdzenia pozostają lokalne (opis kolumny ma limit 280 znaków).
  Zmiana nazwy lub harmonogramu w Notion ich nie usuwa. Nowe wykonanie z Notion
  rutyny z listą czeka na potwierdzenie wszystkich kroków w aplikacji; pozostałe
  komórki synchronizują się dalej. Po potwierdzeniu ponów synchronizację.
- Tabele odtwarzają aktualne ustawienia rutyn i statusy, ale nie zastępują pełnej
  kopii danych: dokładny czas wykonania, wartości i notatki logów oraz historyczne
  rewizje rutyn pozostają lokalne. Czas wykonania importu to ostatnia edycja wiersza
  Notion, nie potwierdzony czas wykonania czynności. Niewykonania wyliczane przez
  domenę nie są zapisywane jako nowe ręczne logi w tabeli. Przyszłe oznaczenia są
  ignorowane do dnia, którego dotyczą.

API używa wersji `2026-03-11`, `data_sources` i paginacji. Własny adapter HTTP jest
oddzielony od silnika synchronizacji, a silnik od interfejsu i repozytoriów.
Referencje: [osobiste tokeny](https://developers.notion.com/guides/get-started/personal-access-tokens),
[data sources](https://developers.notion.com/reference/data-source),
[schemat kolumn](https://developers.notion.com/reference/property-object),
[SecureStore](https://docs.expo.dev/versions/v57.0.0/sdk/securestore/).

Dodanie SecureStore w wersji 1.1.0 wymaga nowego APK (Android versionCode 2).
Następne zmiany czystego JS ponownie korzystają z OTA do tego runtime.

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
Nie umieszczaj tokenu w plikach, issue, PR ani rozmowie.
Gdy workflow nie otrzymuje `EXPO_TOKEN`, sprawdza tylko, czy pod tą samą nazwą
istnieje zmienna Actions, i wskazuje miejsce zapisania Repository secret.
Diagnostyka nie odczytuje innych sekretów ani nie wypisuje wartości poświadczeń. Publiczny identyfikator EAS zapisuje
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

Ręczne uruchomienie **CI and EAS Update** pozwala wybrać `channel`: `preview`,
`development` lub `production`. Domyślny podgląd to `preview`, również z brancha
`main`. Dzięki temu Codex może wysłać OTA do zainstalowanego testowego APK po
scaleniu PR. Automatyczne mapowanie push/PR pozostaje zgodne z tabelą powyżej.

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

## English interface and compact controls

The UI, dates, categories, schedule labels and error messages use English. Stored category keys and existing Notion column names remain compatible with saved data. Personal routine names, notes and checklist text are not rewritten.

Today uses the status circle for its four-state cycle and a pencil icon for editing. Routine cards open the editor directly through their pencil icon. Pause and delete are available in the editor, with deletion confirmed explicitly. Routine calendar cells cycle statuses directly; there are no duplicate status buttons below the grid.

The main tabs are Today, Routines, Notes and Insights. The legacy `/history` route keeps routine results, undo and checklist snapshots available without occupying a main tab.

## Daily notes

Every local calendar date has one editable plain-text note, shown directly below its routines on Today. Dates with no routines and future dates also support notes. Notes autosave after 600ms, on blur and when the app backgrounds; Save now/Retry provides an explicit action. Unsaved drafts live separately from domain records, survive navigation and remain available after a failed write. A date change remounts the editor without moving its text to another date.

The Notes tab lists non-empty daily notes newest date first, supports text/date search, and opens the same editor. The plus action edits today's note; the calendar chooses any other date. Clearing its text removes a note from the list once saved.

`DailyNote`: `id` (the local `YYYY-MM-DD` date), `date`, `content`, `source` (`app`/`notion`), `createdAt`, `updatedAt`. `DailyNoteRepository` stores versioned records under `@routinelog/v1/note/`, independently from routines/logs. Empty records are retained as sync tombstones. No seed reset or destructive migration is performed. The store serializes local note writes and uses compare-and-save for remote imports.

Existing monthly Notion tables receive a dedicated **Notes** Text column automatically through the connected app. A description marker and ledger property ID keep it separate from routine columns, including after renaming. If another property already uses the name, an unused Daily notes name is selected. The notes column never becomes a routine. Clearing a text cell syncs a deletion; deleting the notes column or a whole day row restores the locally saved notes rather than erasing them. A changed property type stops sync safely.

Notes use the same three-way conflict choices as routine sync, with per-date bases in the existing month ledger. Initial empty cells do not erase phone notes. Drafts are flushed before syncing, and imports refuse to replace text being edited or a newer local record. Old and future note months are included without allowing future routine completions. Notes support 20,000 characters, preserving newlines and Unicode. Writes split text into safe chunks below Notion's per-object limit, and long formatted properties are retrieved through pagination before merging. This is plain-text sync; styling is preserved in Notion until the app rewrites that note.

API contracts: [Notion request limits](https://developers.notion.com/reference/request-limits), [retrieve page property items](https://developers.notion.com/reference/retrieve-a-page-property). No new token, native dependency or APK is needed for this feature when the current Notion connection is configured.

## Android Today home-screen widget

Version 1.2.0 (Android versionCode 3) adds a native, resizable RoutineLog Today widget using `react-native-android-widget` 0.26.0 on the existing Expo SDK 57. Expo’s SDK 57 `expo-widgets` API is iOS-only, so upgrading the SDK is not needed for this feature. No handwritten Android application code is maintained.

- Install the new preview APK over the current app to preserve local data. In Today, tap **Add home-screen widget** and accept the launcher prompt. Alternatively, long-press the Android home screen → Widgets → RoutineLog Today.
- The widget uses a light rounded panel, a Today heading with date arrows, category-coloured bars, simple dividers and circular status controls. Rows scroll and the widget can be resized. Tap today's routine row or circle to cycle done → not done → skipped → unchecked. Other app screens keep their dark theme.
- The compact panel uses a 44dp header, 48dp rows, 14sp routine names and 24dp status circles. It fits its content instead of drawing empty white space below a short list. The entire row remains tappable. Android owns the allocated home-screen grid area; long-press and resize the widget to reclaim unused grid space. Extra routines scroll when the available height is filled.
- The arrows browse previous/next days. Past/future days are read-only; tap the heading to return to Today and refresh. Each widget stores its own selected date separately from routine/log data and returns to Today after local midnight. Stale or duplicate arrow taps do not skip dates.
- Routine definitions, logs and writes use the existing repository/store. The library’s background task shares the app’s React host; writes respect the store’s save guard. Background widget writes stay local and sync to Notion when the app next opens.
- Required checklists open a confirmation sheet in the app. The background task cannot complete them without proof. Widget deep links only open this confirmation; they do not mark a routine complete by themselves.
- Actions validate the displayed date and status against current data. Old-day taps and stale/double taps refresh the widget without applying another status change.
- Widget views refresh after saved app changes, on app foreground, through the refresh icon and through Android’s periodic updates. Android limits periodic widget updates to at least 30 minutes and may delay them in power-saving mode. No exact-midnight alarm permission is requested. Tapping a stale widget refreshes it without recording yesterday’s routine.
- Native-only code is guarded and registered before Expo Router through `index.ts`. Core screens still run in Expo Go and web; the home-screen widget needs the built Android runtime.
- Keep `bridge.tsx` and `bridge.android.tsx` on the same source extension: Metro resolves extensions before platform variants, so a `bridge.ts` fallback would hide the native bridge. CI exports Android with `--source-maps`, then runs `node scripts/check-widget-bundle.mjs` to fail if the fallback is included or native registration/bridge/rendering is missing. The existing package script is preserved because Expo fingerprints package scripts conservatively; adding a check in CI does not change the installed native runtime.
- CI runs `EXPO_OFFLINE=1 npx expo install --check` against the version map bundled with the locked Expo SDK. Installed packages are still validated; newly published remote patch recommendations do not change this baseline during an OTA-only UI change. Upgrade native dependencies deliberately, then resolve the fingerprint and build when required. See [Expo CLI environment variables](https://docs.expo.dev/more/expo-cli/#environment-variables).
- **Android widget smoke test** installs the latest finished preview APK on an Android 15 emulator, allows compatible OTA to load, enters a daily note on Today, verifies Notes and persistence after process restart, then checks the widget's rendering, day navigation and status cycle. It never starts an EAS Build. Its diagnostic artifacts contain emulator screenshots, the view hierarchy and native logs from seeded test data.

A new APK is required for this native widget installation. Future JS/UI updates continue through the existing fingerprint-compatible preview OTA workflow. The old APK can receive the separate English UI release but must not receive an incompatible widget OTA. Dispatch the existing **Android native build** workflow with profile `preview` after all quality checks pass.

References: [SDK 57 widget support](https://docs.expo.dev/versions/v57.0.0/sdk/widgets/), [Android widget Expo registration](https://saleksovski.github.io/react-native-android-widget/docs/tutorial/register-widget-expo/), [task handler](https://saleksovski.github.io/react-native-android-widget/docs/api/register-widget-task-handler), [runtime compatibility](https://docs.expo.dev/eas-update/runtime-versions/).

The Android native build workflow also supports `mode: status` for read-only Expo build monitoring. This mode skips quality/build jobs and prints only whitelisted status metadata; it never prints the Expo token, environment values or signed log URLs. Use `mode: build` (the default) only when a native runtime change actually requires a new binary.
