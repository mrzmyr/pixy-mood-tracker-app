import { Modal, Platform } from "react-native";

import { PageModalLayout } from "@/components/PageModalLayout";

/**
 * Sheet for a form or picker that slides up over the current screen. iOS
 * shows a page sheet. Android shows the modal full screen and edge to edge,
 * so the content starts below the status bar: without that, the status bar
 * covers the header and its close button. Back and swipe-down call
 * `onClose`.
 */
export const SheetModal = ({
  visible,
  onClose,
  onShow,
  backgroundColor,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  onShow?: () => void;
  /** Fills the area behind the status bar on Android. Match the header. */
  backgroundColor: string;
  children: React.ReactNode;
}) => (
  <Modal
    visible={visible}
    animationType={Platform.OS === "web" ? "none" : "slide"}
    presentationStyle="pageSheet"
    onRequestClose={onClose}
    onShow={onShow}
  >
    <PageModalLayout style={{ backgroundColor }}>{children}</PageModalLayout>
  </Modal>
);
