import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  type ScrollViewProps,
  type TextInput,
} from 'react-native';

export function useKeyboardTop() {
  const [top, setTop] = useState<number | undefined>(() =>
    Platform.OS === 'web' ? undefined : Keyboard.metrics()?.screenY,
  );
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const show = Keyboard.addListener('keyboardDidShow', (event) =>
      setTop(event.endCoordinates.screenY),
    );
    const change = Keyboard.addListener('keyboardDidChangeFrame', (event) =>
      setTop(event.endCoordinates.screenY),
    );
    const hide = Keyboard.addListener('keyboardDidHide', () =>
      setTop(undefined),
    );
    return () => {
      show.remove();
      change.remove();
      hide.remove();
    };
  }, []);
  return top;
}

const FocusedInput = createContext<(input: TextInput | null) => void>(() => {});
export const useRevealInput = () => useContext(FocusedInput);

// Measure actual window coordinates: Android may resize the viewport or let the
// keyboard cover it. Only add the overlap that remains, never keyboard height
// twice. The same scroll host also works inside a React Native Modal.
export function KeyboardAwareScrollView({
  contentContainerStyle,
  onScroll,
  onLayout,
  onContentSizeChange,
  children,
  ...props
}: ScrollViewProps) {
  const scroll = useRef<ScrollView>(null);
  const focused = useRef<TextInput | null>(null);
  const offset = useRef(0);
  const frame = useRef<number | undefined>(undefined);
  const keyboardTop = useKeyboardTop();
  const [overlap, setOverlap] = useState(0);
  const reveal = useCallback(() => {
    if (Platform.OS === 'web') return;
    if (frame.current !== undefined) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      frame.current = undefined;
      scroll.current
        ?.getNativeScrollRef()
        ?.measureInWindow((_x, top, _w, height) => {
          const bottom = Math.min(top + height, keyboardTop ?? Infinity);
          setOverlap(Math.max(0, top + height - bottom));
          const input = focused.current;
          if (!input?.isFocused() || keyboardTop === undefined) return;
          input.measureInWindow((_ix, inputTop, _iw, inputHeight) => {
            if (focused.current !== input || !input.isFocused()) return;
            const delta =
              inputTop < top + 12
                ? inputTop - top - 12
                : Math.max(0, inputTop + inputHeight - bottom + 16);
            if (Math.abs(delta) > 1)
              scroll.current?.scrollTo({
                y: Math.max(0, offset.current + delta),
                animated: false,
              });
          });
        });
    });
  }, [keyboardTop]);
  useEffect(() => {
    reveal();
    return () => {
      if (frame.current !== undefined) cancelAnimationFrame(frame.current);
    };
  }, [reveal]);
  const bottomPadding =
    StyleSheet.flatten(contentContainerStyle)?.paddingBottom ?? 0;
  return (
    <FocusedInput.Provider
      value={(input) => {
        focused.current = input;
        reveal();
      }}
    >
      <ScrollView
        {...props}
        ref={scroll}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={16}
        contentContainerStyle={[
          contentContainerStyle,
          {
            paddingBottom:
              (typeof bottomPadding === 'number' ? bottomPadding : 0) + overlap,
          },
        ]}
        onScroll={(event) => {
          offset.current = event.nativeEvent.contentOffset.y;
          onScroll?.(event);
        }}
        onLayout={(event) => {
          onLayout?.(event);
          reveal();
        }}
        onContentSizeChange={(width, height) => {
          onContentSizeChange?.(width, height);
          reveal();
        }}
      >
        {children}
      </ScrollView>
    </FocusedInput.Provider>
  );
}
