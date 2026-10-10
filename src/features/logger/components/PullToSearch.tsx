import { useRef, useState } from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import { Search, XCircle } from "react-native-feather";
import useColors from "@/hooks/useColors";
import { t } from "@/lib/translation";
import { RADIUS } from "@/constants/Radius";

const INPUT_HEIGHT = 40;
const PADDING_TOP = 12;
// Search bar height, also the scroll offset that hides it.
const SEARCH_HEIGHT = PADDING_TOP + INPUT_HEIGHT;

/**
 * Vertical scroll view with a search bar hidden above its content, like iOS
 * Settings. Pulling the bar more than halfway into view reveals it and
 * focuses the input. Blurring an empty input hides the bar again.
 */
export const PullToSearch = ({
  query,
  onChangeQuery,
  placeholder,
  testID,
  children,
}: {
  query: string;
  onChangeQuery: (query: string) => void;
  placeholder: string;
  testID: string;
  children: React.ReactNode;
}) => {
  const colors = useColors();
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const [viewportHeight, setViewportHeight] = useState(0);
  const contentHeight = useRef(0);
  const isInitiallyHidden = useRef(false);

  // Layout and content size arrive in either order; hide once both fit.
  const hideInitially = (viewport: number) => {
    if (
      isInitiallyHidden.current ||
      viewport === 0 ||
      contentHeight.current < viewport + SEARCH_HEIGHT
    ) {
      return;
    }
    isInitiallyHidden.current = true;
    scrollRef.current?.scrollTo({ y: SEARCH_HEIGHT, animated: false });
  };

  const hide = () =>
    scrollRef.current?.scrollTo({ y: SEARCH_HEIGHT, animated: true });

  const reveal = () => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
    inputRef.current?.focus();
  };

  // Snap a half-visible bar fully in or out. Only a drag focuses; a fling
  // that ends at the top leaves the bar visible without the keyboard.
  const settle =
    (isDrag: boolean) => (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { y } = event.nativeEvent.contentOffset;
      if (y >= SEARCH_HEIGHT || inputRef.current?.isFocused()) {
        return;
      }
      if (y < SEARCH_HEIGHT / 2) {
        if (isDrag) {
          reveal();
        }
        return;
      }
      if (query === "") {
        hide();
      }
    };

  return (
    <ScrollView
      ref={scrollRef}
      testID={testID}
      // iOS starts hidden; Android ignores `contentOffset` and scrolls on layout.
      contentOffset={{ x: 0, y: SEARCH_HEIGHT }}
      onLayout={(event) => {
        setViewportHeight(event.nativeEvent.layout.height);
        hideInitially(event.nativeEvent.layout.height);
      }}
      onContentSizeChange={(_, height) => {
        contentHeight.current = height;
        hideInitially(viewportHeight);
      }}
      // Short content still scrolls far enough to hide the bar.
      contentContainerStyle={{ minHeight: viewportHeight + SEARCH_HEIGHT }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      onScrollEndDrag={settle(true)}
      onMomentumScrollEnd={settle(false)}
    >
      <View
        style={{
          height: SEARCH_HEIGHT,
          paddingTop: PADDING_TOP,
          paddingHorizontal: 20,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            height: INPUT_HEIGHT,
            backgroundColor: colors.textInputBackground,
            borderRadius: RADIUS.sm,
            paddingHorizontal: 10,
          }}
        >
          <Search color={colors.textInputPlaceholder} width={18} />
          <TextInput
            ref={inputRef}
            testID={`${testID}-input`}
            accessibilityLabel={placeholder}
            placeholder={placeholder}
            placeholderTextColor={colors.textInputPlaceholder}
            value={query}
            onChangeText={onChangeQuery}
            onBlur={() => {
              if (query === "") {
                hide();
              }
            }}
            returnKeyType="search"
            autoCorrect={false}
            autoComplete="off"
            textContentType="none"
            style={{
              flex: 1,
              height: INPUT_HEIGHT,
              marginLeft: 8,
              fontSize: 17,
              color: colors.textInputText,
            }}
          />
          {query !== "" && (
            <Pressable
              accessibilityLabel={t("clear")}
              accessibilityRole="button"
              hitSlop={12}
              onPress={() => onChangeQuery("")}
            >
              <XCircle color={colors.textInputPlaceholder} width={18} />
            </Pressable>
          )}
        </View>
      </View>
      {children}
    </ScrollView>
  );
};
