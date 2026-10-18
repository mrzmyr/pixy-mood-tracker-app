import * as Sentry from "@sentry/react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View, VirtualizedList } from "react-native";
import Button from "@/components/button";
import useColors from "@/hooks/use-colors";
import { useScrollBottomPadding } from "@/hooks/use-scroll-bottom-padding";
import { t } from "@/lib/translation";
import { loadLicensesText } from "../licenses-text";

interface Item {
  key: string;
  value: string;
}

type LicensesState =
  | { status: "loading" }
  | { status: "loaded"; slices: string[] }
  | { status: "failed" };

const LicensesContent = ({ onRetry }: { onRetry: () => void }) => {
  const colors = useColors();
  const paddingBottom = useScrollBottomPadding(16);
  const [state, setState] = useState<LicensesState>({ status: "loading" });

  useEffect(() => {
    let isCurrent = true;
    const load = async () => {
      try {
        const text = await loadLicensesText();
        if (isCurrent) {
          setState({ status: "loaded", slices: text.split("-----") });
        }
      } catch (error) {
        console.error(error);
        Sentry.captureException(error);
        if (isCurrent) {
          setState({ status: "failed" });
        }
      }
    };
    void load();
    return () => {
      isCurrent = false;
    };
  }, []);

  if (state.status !== "loaded") {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          backgroundColor: colors.background,
        }}
      >
        {state.status === "loading" ? (
          <ActivityIndicator
            color={colors.loadingIndicator}
            testID="licenses-loading"
          />
        ) : (
          <>
            <Text
              style={{
                color: colors.text,
                fontSize: 17,
                lineHeight: 24,
                textAlign: "center",
                marginBottom: 24,
              }}
              testID="licenses-error"
            >
              {t("licenses_load_failed")}
            </Text>
            <Button type="secondary" onPress={onRetry} testID="licenses-retry">
              {t("licenses_retry")}
            </Button>
          </>
        )}
      </View>
    );
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
      }}
    >
      <VirtualizedList
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: 16, paddingBottom }}
        data={state.slices}
        initialNumToRender={4}
        renderItem={({ item }: { item: Item }) => (
          <Text
            key={item.key}
            style={{
              color: colors.text,
              fontSize: 14,
            }}
          >
            {item.value}
          </Text>
        )}
        keyExtractor={(item) => item.key}
        getItemCount={(items) => items.length}
        getItem={(data, index): Item => ({
          key: `text-${index}`,
          value: data[index],
        })}
      />
    </View>
  );
};

/**
 * Settings > Licenses: third-party notices from `assets/licenses.txt`, one
 * list item per `-----` section. The text loads when the screen opens.
 * Retry remounts the content, so each attempt starts in the loading state.
 */
export const LicensesScreen = () => {
  const [attempt, setAttempt] = useState(0);
  return (
    <LicensesContent
      key={attempt}
      onRetry={() => setAttempt((count) => count + 1)}
    />
  );
};
