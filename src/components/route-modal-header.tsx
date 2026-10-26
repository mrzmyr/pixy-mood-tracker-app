import { HeaderButton } from "@/components/header-button";
import { getCloseLabel } from "@/components/close-label";
import type { HeaderButtonKind } from "@/components/header-button";
import ModalHeader from "@/components/modal-header";

/** Props shared by the iOS and Android headers. Same props on both platforms. */
export interface RouteModalHeaderProps {
  title: string;
  /** Leaves the screen without saving. */
  onClose: () => void;
  /** Test id of the cancel or close button. */
  closeTestID?: string;
  /** The one trailing action, for example Save. Marks the screen as a form. */
  confirm?: {
    label: string;
    onPress: () => void;
    /** `confirm` saves (default). `send` sends. */
    kind?: Exclude<HeaderButtonKind, "cancel">;
    disabled?: boolean;
    testID?: string;
  };
}

/**
 * Header of a route screen presented as modal ([Modal Headers](../../DESIGN.md#modal-headers)).
 * Web draws it in the screen. iOS native bar: `route-modal-header.ios.tsx`.
 * Android top app bar: `route-modal-header.android.tsx`.
 */
const RouteModalHeader = ({
  title,
  onClose,
  closeTestID,
  confirm,
}: RouteModalHeaderProps) => (
  <ModalHeader
    title={title}
    left={
      <HeaderButton
        kind="cancel"
        label={getCloseLabel(Boolean(confirm))}
        onPress={onClose}
        testID={closeTestID}
      />
    }
    right={
      confirm ? (
        <HeaderButton {...confirm} kind={confirm.kind ?? "confirm"} />
      ) : undefined
    }
  />
);

export default RouteModalHeader;
