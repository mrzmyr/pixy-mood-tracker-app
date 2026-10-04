import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuItem,
  Host,
  RadioButton,
  Text,
  TextButton,
} from "@expo/ui/jetpack-compose";
import useColors from "@/hooks/useColors";
import { t } from "@/lib/translation";
import { CALENDAR_VIEWS } from "../../../views";
import { getViewLabel } from "./types";
import type { ViewMenuProps } from "./types";

/** "View" header button. Material dropdown with a radio on the current view. */
export const ViewMenu = ({ view, onChange }: ViewMenuProps) => {
  const colors = useColors();
  const [isExpanded, setIsExpanded] = useState(false);
  const color = String(colors.linkButtonTextPrimary);

  return (
    <Host matchContents>
      <DropdownMenu
        expanded={isExpanded}
        onDismissRequest={() => setIsExpanded(false)}
        color={colors.background}
      >
        <DropdownMenu.Trigger>
          <TextButton onClick={() => setIsExpanded(true)}>
            <Text color={color} style={{ fontSize: 17, fontWeight: "500" }}>
              {t("calendar_view")}
            </Text>
          </TextButton>
        </DropdownMenu.Trigger>
        <DropdownMenu.Items>
          {CALENDAR_VIEWS.map((item) => (
            <DropdownMenuItem
              key={item}
              elementColors={{ textColor: colors.text }}
              onClick={() => {
                setIsExpanded(false);
                onChange(item);
              }}
            >
              <DropdownMenuItem.LeadingIcon>
                <RadioButton
                  selected={item === view}
                  colors={{ selectedColor: color }}
                />
              </DropdownMenuItem.LeadingIcon>
              <DropdownMenuItem.Text>
                <Text>{getViewLabel(item)}</Text>
              </DropdownMenuItem.Text>
            </DropdownMenuItem>
          ))}
        </DropdownMenu.Items>
      </DropdownMenu>
    </Host>
  );
};
