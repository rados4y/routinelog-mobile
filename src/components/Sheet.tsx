import type { ReactNode } from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme';
import { Icon } from './Icon';
import { KeyboardAwareScrollView } from './KeyboardAwareScrollView';

export function Sheet({
  visible,
  title,
  onClose,
  children,
  footer,
  fullScreen = false,
}: {
  visible: boolean;
  title: string;
  onClose(): void;
  children: ReactNode;
  footer?: ReactNode;
  fullScreen?: boolean;
}) {
  const panel = (
    <View
      accessibilityViewIsModal
      style={[styles.sheet, fullScreen && styles.full]}
    >
      <View style={styles.header}>
        <Text
          accessibilityRole="header"
          style={[styles.title, fullScreen && styles.fullTitle]}
        >
          {title}
        </Text>
        {!fullScreen && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={onClose}
            style={styles.close}
          >
            <Icon name="close" />
          </Pressable>
        )}
      </View>
      <KeyboardAwareScrollView
        contentContainerStyle={[
          styles.content,
          fullScreen && { gap: 0, paddingTop: 8, paddingBottom: 8 },
        ]}
      >
        {children}
      </KeyboardAwareScrollView>
      {footer && (
        <View
          style={{ padding: 12, borderTopWidth: 1, borderColor: colors.border }}
        >
          {footer}
        </View>
      )}
    </View>
  );
  return (
    <Modal
      visible={visible}
      transparent={!fullScreen}
      animationType="fade"
      onRequestClose={onClose}
    >
      {fullScreen ? (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          {panel}
        </SafeAreaView>
      ) : (
        <View style={styles.overlay}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close panel"
            onPress={onClose}
            style={StyleSheet.absoluteFill}
          />
          {panel}
        </View>
      )}
    </Modal>
  );
}
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: '#00000090',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    width: '100%',
    maxWidth: 660,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  full: { flex: 1, maxHeight: '100%', borderWidth: 0, borderRadius: 0 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 16,
    paddingRight: 6,
    minHeight: 56,
  },
  title: { color: colors.text, fontSize: 19, fontWeight: '700', flex: 1 },
  fullTitle: { color: colors.accent, fontSize: 20, textAlign: 'center' },
  close: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { padding: 16, paddingBottom: 30, gap: 16 },
});
