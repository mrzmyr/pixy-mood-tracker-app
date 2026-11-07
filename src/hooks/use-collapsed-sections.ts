import { useSettings } from "@/state/settings";

/**
 * Folded state of check-in section cards, stored on this device. Keys name
 * one section, such as `tag-category:<id>` or `quick-check-in:emotions`.
 * A section the user never toggled uses `isDefaultCollapsed`.
 */
export const useCollapsedSections = () => {
  const { settings, setSettings } = useSettings();

  const isCollapsed = (key: string, isDefaultCollapsed = false) =>
    settings.sectionCollapse[key] ?? isDefaultCollapsed;

  return {
    isCollapsed,
    toggle: (key: string, isDefaultCollapsed = false) =>
      setSettings((current) => ({
        ...current,
        sectionCollapse: {
          ...current.sectionCollapse,
          [key]: !(current.sectionCollapse[key] ?? isDefaultCollapsed),
        },
      })),
  };
};
