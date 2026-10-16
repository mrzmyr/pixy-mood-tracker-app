import { Button, ContextMenu, Host, RNHostView } from "@expo/ui/swift-ui";
import { t } from "@/lib/translation";
import type { ItemMenuProps } from "./itemMenuTypes";

/**
 * Long press on a tag or person on iOS: the system context menu with Edit,
 * Archive, and a destructive Delete. `Host` and `RNHostView` match the
 * item's size, so chips of any width keep their layout.
 */
export const ItemMenu = ({
  menu: { onEdit, onArchive, archiveLabel, onDelete },
  style,
  children,
}: ItemMenuProps) => (
  <Host matchContents style={style}>
    <ContextMenu>
      <ContextMenu.Trigger>
        <RNHostView matchContents>{children}</RNHostView>
      </ContextMenu.Trigger>
      <ContextMenu.Items>
        <Button label={t("edit")} systemImage="pencil" onPress={onEdit} />
        {onArchive && (
          <Button
            label={archiveLabel}
            systemImage="archivebox"
            onPress={onArchive}
          />
        )}
        <Button
          label={t("delete")}
          systemImage="trash"
          // oxlint-disable-next-line jsx-a11y/aria-role -- SwiftUI button role, not an ARIA role.
          role="destructive"
          onPress={onDelete}
        />
      </ContextMenu.Items>
    </ContextMenu>
  </Host>
);
