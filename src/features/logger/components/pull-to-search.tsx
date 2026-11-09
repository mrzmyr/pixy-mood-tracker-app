import { useRef, useState } from "react";
import { ScrollView, View } from "react-native";
import type {
  TextInput,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ViewStyle,
} from "react-native";
import { SearchInput } from "@/components/search-input";
import { FIELD_HEIGHT } from "@/components/text-field";

const PADDING_TOP = 12;
// Search bar height, also the scroll offset that hides it.
const SEARCH_HEIGHT = PADDING_TOP + FIELD_HEIGHT;

/**
 * Vertical scroll view with a search bar hidden above its content, like iOS
 * Settings. Pulling the bar more than halfway into view reveals it and
 * focuses the input. Blurring an empty input hides the bar again.
 * `inset` pads the bar horizontally; pass 0 inside an already padded parent.
 * `accessory` sits right of the input, like a mic button.
 */
export const PullToSearch = ({
  query,
  onChangeQuery,
  placeholder,
  testID,
  inset = 20,
  accessory,
  contentContainerStyle,
  children,
}: {
  query: string;
  onChangeQuery: (query: string) => void;
  placeholder: string;
  testID: string;
  inset?: number;
  accessory?: React.ReactNode;
  contentContainerStyle?: ViewStyle;
  children: React.ReactNode;
}) => {
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const [viewportHeight, setViewportHeight] = useState(0);
  const contentHeight = useRef(0);
  const isInitiallyHidden = useRef(false);
  // iOS also reports the end of `scrollTo` as a momentum end. Settling on
  // those ends loops when the hidden offset is out of reach, and the scroll
  // view swallows every tap while it thinks it is still moving.
  const isUserMomentum = useRef(false);

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
      contentContainerStyle={{
        ...contentContainerStyle,
        minHeight: viewportHeight + SEARCH_HEIGHT,
      }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      onScrollEndDrag={settle(true)}
      onMomentumScrollBegin={() => {
        isUserMomentum.current = true;
      }}
      onMomentumScrollEnd={(event) => {
        if (!isUserMomentum.current) {
          return;
        }
        isUserMomentum.current = false;
        settle(false)(event);
      }}
    >
      <View
        style={{
          height: SEARCH_HEIGHT,
          paddingTop: PADDING_TOP,
          paddingHorizontal: inset,
          flexDirection: "row",
          gap: 8,
        }}
      >
        <View style={{ flex: 1 }}>
          <SearchInput
            ref={inputRef}
            testID={`${testID}-input`}
            placeholder={placeholder}
            value={query}
            onChange={onChangeQuery}
            onBlur={() => {
              if (query === "") {
                hide();
              }
            }}
          />
        </View>
        {accessory}
      </View>
      {children}
    </ScrollView>
  );
};
