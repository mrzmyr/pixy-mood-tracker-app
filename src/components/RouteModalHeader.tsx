import { CloseButton } from "@/components/CloseButton";
import LinkButton from "@/components/LinkButton";
import ModalHeader from "@/components/ModalHeader";
import { t } from "@/lib/translation";

/** Props shared by the iOS and Android headers. Same props on both platforms. */
export interface RouteModalHeaderProps {
  title: string;
  /** Leaves the screen without saving. */
  onClose: () => void;
  /** Test id of the cancel or close button. */
  closeTestID?: string;
  /** Primary text action, for example Save. Marks the screen as a form. */
  action?: React.ReactNode;
}

/**
 * Header of a route screen presented as modal.
 * iOS: form with `action` keeps text Cancel top left; other screens get a
 * close button top right. Android variant: `RouteModalHeader.android.tsx`.
 */
const RouteModalHeader = ({
  title,
  onClose,
  closeTestID,
  action,
}: RouteModalHeaderProps) => {
  if (action) {
    return (
      <ModalHeader
        title={title}
        left={
          <LinkButton onPress={onClose} type="primary" testID={closeTestID}>
            {t("cancel")}
          </LinkButton>
        }
        right={action}
      />
    );
  }

  return (
    <ModalHeader
      title={title}
      right={<CloseButton testID={closeTestID} onPress={onClose} />}
    />
  );
};

export default RouteModalHeader;
