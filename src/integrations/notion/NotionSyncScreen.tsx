import { useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { colors, common } from '../../theme';
import { supportsNotionConnection } from './credentials';
import { notionPageUrl, useNotion } from './useNotion';

export function NotionSyncScreen() {
  const [token, setToken] = useState('');
  const state = useNotion();
  const connect = async () => {
    if (await state.connect(token)) {
      setToken('');
      await state.sync();
    }
  };
  return (
    <Screen
      title="Notion"
      subtitle="Twoje rutyny w telefonie i miesięcznej tabeli"
      action={<Button label="Wróć" compact onPress={() => router.back()} />}
    >
      <View style={common.card}>
        <Text style={common.heading}>Jeden miesiąc, jedna tabela</Text>
        <Text style={common.subtitle}>
          Dni są w wierszach, rutyny w kolumnach. Dodaj, zmień nazwę lub usuń
          kolumnę w bieżącym miesiącu, a zmiana pojawi się w aplikacji. Zmiany w
          telefonie trafiają do Notion.
        </Text>
        <Button
          label="Otwórz RoutineLog w Notion"
          onPress={() => void Linking.openURL(notionPageUrl)}
        />
      </View>
      <View style={common.card}>
        <Text style={common.heading}>
          {state.connected ? 'Połączono z Notion' : 'Połącz swoje konto'}
        </Text>
        {!supportsNotionConnection && (
          <Text style={common.subtitle}>
            Połączenie jest dostępne w aplikacji na Androidzie i Expo Go.
            Podgląd w przeglądarce nie przechowuje tokenów.
          </Text>
        )}
        {state.connected ? (
          <>
            <Text style={common.subtitle}>
              {state.lastSuccess
                ? `Ostatnia synchronizacja: ${new Date(state.lastSuccess).toLocaleString('pl-PL')}`
                : 'Pierwsza synchronizacja jeszcze nie została ukończona.'}
            </Text>
            <Button
              label="Synchronizuj teraz"
              tone="primary"
              disabled={state.busy}
              onPress={() => void state.sync()}
            />
            <Button
              label="Rozłącz Notion"
              disabled={state.busy}
              onPress={() => void state.disconnect()}
            />
          </>
        ) : (
          <>
            <Text style={common.subtitle}>
              Utwórz osobisty token z uprawnieniem Notion API dla konta, na
              którym jest strona RoutineLog. Wklej go wyłącznie tutaj. Token
              zostanie zapisany w bezpiecznym magazynie telefonu.
            </Text>
            <Button
              label="Utwórz token w Notion"
              onPress={() =>
                void Linking.openURL('https://www.notion.so/developers/tokens')
              }
            />
            {supportsNotionConnection && (
              <>
                <Text style={common.label}>Osobisty token Notion</Text>
                <TextInput
                  accessibilityLabel="Osobisty token Notion"
                  style={common.field}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={token}
                  onChangeText={setToken}
                  placeholder="Wklej token"
                  placeholderTextColor={colors.muted}
                />
                <Button
                  label="Połącz i synchronizuj"
                  tone="primary"
                  disabled={state.busy || token.trim().length < 10}
                  onPress={() => void connect()}
                />
              </>
            )}
          </>
        )}
        {state.busy && (
          <View style={common.row}>
            <ActivityIndicator color={colors.accentLight} />
            <Text style={common.subtitle}>
              Synchronizowanie… Możesz wrócić do rutyn.
            </Text>
          </View>
        )}
        {state.error && (
          <Text
            accessibilityRole="alert"
            style={[common.text, { color: colors.warning }]}
          >
            {state.error}
          </Text>
        )}
        {state.conflict && (
          <>
            <Text style={common.subtitle}>
              Wybór dotyczy rozbieżnych zmian w tej synchronizacji. Pozostałe
              zmiany zostaną połączone.
            </Text>
            <Button
              label="Zachowaj wersję z aplikacji"
              disabled={state.busy}
              onPress={() => void state.sync('app')}
            />
            <Button
              label="Zachowaj wersję z Notion"
              disabled={state.busy}
              onPress={() => void state.sync('notion')}
            />
          </>
        )}
      </View>
      <View style={common.card}>
        <Text style={common.heading}>Jak działa synchronizacja</Text>
        <Text style={common.subtitle}>
          Działa po otwarciu aplikacji, po zapisaniu zmian oraz co minutę, gdy
          aplikacja jest otwarta. Bez internetu wszystko zapisuje się lokalnie.
          W tle systemu synchronizacja nie jest uruchamiana.
        </Text>
        <Text style={common.subtitle}>
          Opis rutyny znajdziesz w opisie kolumny. Możesz tam zmieniać notatkę
          oraz pola Kategoria, Godzina, Plan i Aktywna. Nowa kolumna domyślnie
          tworzy codzienną rutynę.
        </Text>
        <Text style={common.subtitle}>
          Kolumna typu select obsługuje Wykonane, Pominięte i Niewykonane; puste
          pole cofa oznaczenie. Checkbox obsługuje wykonanie i cofnięcie.
          Pominięcia pozostają w aplikacji, jeśli kolumna jest checkboxem.
        </Text>
        <Text style={common.subtitle}>
          Poprzednie miesiące zachowują swoje kolumny. Zmiana statusu w archiwum
          nadal synchronizuje historię. Usunięcie kolumny bieżącego miesiąca
          usuwa rutynę z planu, zachowując wcześniejsze logi w telefonie.
        </Text>
        <Text style={common.small}>
          Nowy telefon może odtworzyć ustawienia rutyn i statusy z tabel.
          Dokładna godzina wykonania, wartości, dodatkowe notatki logów i
          wcześniejsze wersje harmonogramu pozostają danymi lokalnymi. Godzina
          wpisu zaimportowanego z Notion oznacza czas ostatniej edycji wiersza.
        </Text>
      </View>
    </Screen>
  );
}
