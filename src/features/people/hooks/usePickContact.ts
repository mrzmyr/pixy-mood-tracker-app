import * as Linking from "expo-linking";
import { useCallback } from "react";
import Alert from "@/lib/Alert";
import { t } from "@/lib/translation";
import { getPeopleSources } from "../sources";
import type { PickedContact } from "../sources";

/**
 * Opens the contact picker. A refused permission shows an alert that leads
 * to the system settings; any other failure resolves `null` like a cancel.
 */
export const usePickContact = () =>
  useCallback(async (): Promise<PickedContact | null> => {
    try {
      return await getPeopleSources().pickContact();
    } catch (error) {
      const isPermissionDenied =
        error instanceof Error &&
        "status" in error &&
        error.status === "contacts_permission_denied";
      if (isPermissionDenied) {
        Alert.alert(
          t("people_contacts_denied_title"),
          t("people_contacts_denied_message"),
          [
            { text: t("cancel"), style: "cancel" },
            {
              text: t("people_open_settings"),
              onPress: () => {
                void Linking.openSettings();
              },
            },
          ]
        );
      } else {
        console.warn(error);
      }
      return null;
    }
  }, []);
