import { Component } from "react";
import type { ErrorInfo } from "react";
import { Text, View } from "react-native";

import useColors from "@/hooks/useColors";
import type { CatalogEntry } from "@/dev/designGuide/types";

const PHONE_WIDTH = 390;

interface BoundaryState {
  error: Error | null;
}

// Keeps one broken preview from blanking the whole catalog.
class PreviewBoundary extends Component<
  { children: React.ReactNode; name: string },
  BoundaryState
> {
  constructor(props: { children: React.ReactNode; name: string }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn(`[design-guide] ${this.props.name} failed`, {
      status: "design_guide_preview_failed",
      message: `${this.props.name} preview failed to render`,
      why: error.message,
      fix: "Pass sample props or providers the component needs on web",
      componentStack: info.componentStack,
    });
  }

  render() {
    if (this.state.error) {
      return (
        <View style={{ padding: 12, backgroundColor: "#fee2e2" }}>
          <Text style={{ color: "#991b1b", fontWeight: "600" }}>
            Preview failed on web
          </Text>
          <Text style={{ color: "#991b1b", marginTop: 4 }}>
            {this.state.error.message}
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

const STAGE_MAX_WIDTH: Record<
  NonNullable<CatalogEntry["frame"]>,
  number | "100%"
> = {
  component: 560,
  fluid: "100%",
  phone: PHONE_WIDTH,
};

/**
 * Catalog card: breadcrumb, name, note, and source path above a stage that
 * renders the live preview centered on the app background.
 */
export const Preview = ({
  entry,
  path,
}: {
  entry: CatalogEntry;
  path: string[];
}) => {
  const colors = useColors();
  const frame = entry.frame ?? "component";
  const isPhone = frame === "phone";

  return (
    <View
      style={{
        backgroundColor: colors.cardBackground,
        borderColor: colors.cardBorder,
        borderWidth: 1,
        borderRadius: 24,
        padding: 24,
        marginBottom: 24,
      }}
    >
      <Text style={{ fontSize: 13, color: colors.textSecondary }}>
        {path.join("  ›  ")}
      </Text>
      <Text
        style={{
          fontSize: 28,
          fontWeight: "700",
          letterSpacing: -0.5,
          color: colors.text,
          marginTop: 8,
        }}
      >
        {entry.name}
      </Text>
      {entry.note ? (
        <Text
          style={{
            fontSize: 15,
            lineHeight: 22,
            color: colors.textSecondary,
            marginTop: 8,
            maxWidth: 640,
          }}
        >
          {entry.note}
        </Text>
      ) : null}
      <View
        style={{
          alignSelf: "flex-start",
          marginTop: 16,
          paddingVertical: 6,
          paddingHorizontal: 10,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: colors.cardBorder,
          backgroundColor: colors.background,
        }}
      >
        <Text
          style={{
            fontSize: 13,
            color: colors.text,
            fontFamily: "monospace",
          }}
        >
          src/{entry.source}
        </Text>
      </View>
      <View
        style={{
          marginTop: 24,
          minHeight: 200,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: colors.cardBorder,
          backgroundColor: colors.background,
          padding: isPhone ? 24 : 40,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View
          style={{
            width: "100%",
            maxWidth: STAGE_MAX_WIDTH[frame],
            borderRadius: isPhone ? 16 : 0,
            borderWidth: isPhone ? 1 : 0,
            borderColor: colors.cardBorder,
            overflow: isPhone ? "hidden" : "visible",
          }}
        >
          <PreviewBoundary name={entry.name}>{entry.render()}</PreviewBoundary>
        </View>
      </View>
    </View>
  );
};

/** Color swatch with token name and value. */
export const Swatch = ({ name, value }: { name: string; value: string }) => {
  const colors = useColors();
  return (
    <View style={{ width: 120, marginRight: 12, marginBottom: 12 }}>
      <View
        style={{
          height: 40,
          borderRadius: 8,
          backgroundColor: value,
          borderWidth: 1,
          borderColor: colors.menuListItemBorder,
        }}
      />
      <Text style={{ fontSize: 12, color: colors.text, marginTop: 4 }}>
        {name}
      </Text>
      <Text style={{ fontSize: 12, color: colors.textSecondary }}>{value}</Text>
    </View>
  );
};

/** Wrapping row with a gap, for side-by-side variants. */
export const Row = ({ children }: { children: React.ReactNode }) => (
  <View
    style={{
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
    }}
  >
    {children}
  </View>
);

/** Small caption above a variant. */
export const Caption = ({ children }: { children: string }) => {
  const colors = useColors();
  return (
    <Text
      style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 4 }}
    >
      {children}
    </Text>
  );
};
