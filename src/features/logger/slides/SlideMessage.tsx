import { getLogEditMarginTop } from "@/helpers/responsive";
import { t } from "@/lib/translation";
import useColors from "@/hooks/useColors";
import type { LogItem } from "@/features/logs";
import { PhotoViewerModal, usePhotoActions } from "@/features/photos";
import type { LogPhoto } from "@/types";
import { useTemporaryLog } from "../temporaryLog";
import { useEffect, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  View,
} from "react-native";
import type { TextInput } from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import DismissKeyboard from "@/components/DismisKeyboard";
import LinkButton from "@/components/LinkButton";
import TextArea from "@/components/TextArea";
import { PhotoStrip } from "../components/PhotoStrip";
import { PhotoToolbar } from "../components/PhotoToolbar";
import { usePhotosHint } from "../hooks/usePhotosHint";
import { Footer } from "./Footer";

const MAX_LENGTH = 10 * 1000;

const NO_PHOTOS: LogPhoto[] = [];

// Space the floating next/save button covers at the slide's right edge:
// `SlideAction` right padding 32 plus button 54, minus slide padding 20,
// plus 8 gap.
const FLOAT_BUTTON_CLEARANCE = 74;

// Keeps the last lines above the floating next/save button while typing.
const INPUT_BOTTOM_PADDING_TYPING = 72;

const ON_EVENT_NAME =
  Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
const OFF_EVENT_NAME =
  Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

/**
 * Keyboard state of the slide. `inset` is the bottom padding that keeps the
 * content above the keyboard on iOS. The logger sheet ends at the screen
 * bottom, so the keyboard covers the slide by its full height (same as
 * `SlideAction`). A fixed `KeyboardAvoidingView` offset misses the sheet
 * position. Android keeps the `KeyboardAvoidingView`, so `inset` stays 0.
 */
const useKeyboard = () => {
  const [keyboard, setKeyboard] = useState({ visible: false, inset: 0 });

  useEffect(() => {
    const show = Keyboard.addListener(ON_EVENT_NAME, (event) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setKeyboard({
        visible: true,
        inset:
          Platform.OS === "ios" ? Math.round(event.endCoordinates.height) : 0,
      });
    });
    const hide = Keyboard.addListener(OFF_EVENT_NAME, () => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setKeyboard({ visible: false, inset: 0 });
    });

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return keyboard;
};

/**
 * Free-text note slide with the photo toolbar. The question is the input
 * placeholder and the text fills the slide without a box. Draft photos show
 * in a strip between input and toolbar. `inputRef` points at the text input
 * so the logger can focus it.
 */
export const SlideMessage = ({
  inputRef,
  isActive,
  mode,
  onChange,
  onDisableStep,
  showDisable,
}: {
  inputRef: React.RefObject<TextInput | null>;
  /** The slide is current; starts the one-time photo hint. */
  isActive: boolean;
  mode: "create" | "edit";
  onChange: (text: LogItem["message"]) => void;
  onDisableStep: () => void;
  showDisable: boolean;
}) => {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const tempLog = useTemporaryLog();
  const marginTop = getLogEditMarginTop();
  const keyboard = useKeyboard();
  const keyboardVisible = keyboard.visible;
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  // The draft is an empty object until the logger initializes it.
  const photos = tempLog.data.photos ?? NO_PHOTOS;
  const photoActions = usePhotoActions({
    photos,
    mode,
    onChange: (next) => {
      tempLog.update({ photos: next });
    },
  });
  const photosHint = usePhotosHint({
    isActive,
    draftPhotosCount: photos.length,
  });

  const handleHintEnd = () => {
    photosHint.markShown();
  };

  const handleRemovePhoto = (photo: LogPhoto) => {
    photoActions.remove(photo);
  };

  // Pickers take the focus. Give it back so the user keeps typing.
  const addPhotos = async (add: () => Promise<void>) => {
    const shouldRefocus = keyboardVisible;
    await add();
    if (shouldRefocus) {
      inputRef.current?.focus();
    }
  };

  // The footer only exists while the disable link shows and the keyboard is
  // hidden, so typing gets the full height between header and keyboard.
  const footerVisible = showDisable && !keyboardVisible;

  return (
    <KeyboardAvoidingView
      enabled={Platform.OS === "android"}
      keyboardVerticalOffset={marginTop + insets.top + 16}
      behavior="height"
      style={{
        flex: 1,
        paddingBottom: keyboard.inset,
      }}
    >
      <DismissKeyboard>
        <View
          style={{
            flex: 1,
            backgroundColor: colors.logBackground,
            width: "100%",
            paddingHorizontal: 20,
            paddingBottom: keyboardVisible ? 8 : insets.bottom + 16,
          }}
        >
          <View
            style={{
              flex: 1,
              marginTop: 8,
            }}
          >
            <TextArea
              ref={inputRef}
              accessibilityLabel={t("log_note_question")}
              testID="log-message"
              placeholder={t("log_note_question")}
              value={tempLog?.data?.message}
              onChange={onChange}
              maxLength={MAX_LENGTH}
              style={{
                flex: 1,
                marginBottom: 0,
                borderWidth: 0,
                backgroundColor: "transparent",
                paddingHorizontal: 0,
                paddingTop: 8,
                paddingBottom: keyboardVisible
                  ? INPUT_BOTTOM_PADDING_TYPING
                  : 16,
                fontSize: 18,
                lineHeight: 26,
              }}
            />
          </View>
          {photos.length > 0 && (
            <PhotoStrip
              photos={photos}
              reservedEnd={FLOAT_BUTTON_CLEARANCE}
              onOpen={setViewerIndex}
              onRemove={handleRemovePhoto}
            />
          )}
          <PhotoToolbar
            count={photos.length}
            disabled={photoActions.isAdding}
            isPulsing={photosHint.isVisible}
            onPulseEnd={handleHintEnd}
            reservedEnd={FLOAT_BUTTON_CLEARANCE}
            onLibrary={() => addPhotos(photoActions.addFromLibrary)}
            onCamera={() => addPhotos(photoActions.addFromCamera)}
          />
          {footerVisible && (
            <Footer>
              <LinkButton
                type="secondary"
                onPress={onDisableStep}
                style={{
                  fontWeight: "400",
                }}
              >
                {t("log_message_disable")}
              </LinkButton>
            </Footer>
          )}
        </View>
      </DismissKeyboard>
      {viewerIndex !== null && (
        <PhotoViewerModal
          isVisible
          photos={photos}
          initialIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      )}
    </KeyboardAvoidingView>
  );
};
