import { useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import LinkButton from "@/components/LinkButton";
import { BLOCK_GROUPS } from "@/dev/designGuide/blocks";
import { COMPONENT_GROUPS } from "@/dev/designGuide/components";
import { Preview } from "@/dev/designGuide/Preview";
import type { CatalogGroup } from "@/dev/designGuide/types";
import { getFixture } from "@/dev/fixtures";
import { useLoadFixture } from "@/dev/useLoadFixture";
import useColors from "@/hooks/useColors";

const SIDEBAR_WIDTH = 220;
const WIDE_BREAKPOINT = 900;

const KINDS = [
  {
    id: "components",
    title: "Components",
    description: "Single-purpose building blocks.",
    groups: COMPONENT_GROUPS,
  },
  {
    id: "blocks",
    title: "Blocks",
    description: "Compositions of components, as they appear in screens.",
    groups: BLOCK_GROUPS,
  },
];

const countEntries = (groups: CatalogGroup[]) =>
  groups.reduce((sum, group) => sum + group.entries.length, 0);

const Sidebar = ({ onSelect }: { onSelect: (id: string) => void }) => {
  const colors = useColors();
  return (
    <ScrollView
      style={{
        width: SIDEBAR_WIDTH,
        flexGrow: 0,
        flexShrink: 0,
        borderRightWidth: 1,
        borderRightColor: colors.menuListItemBorder,
      }}
      contentContainerStyle={{ padding: 20 }}
    >
      {KINDS.map((kind) => (
        <View key={kind.id} style={{ marginBottom: 24 }}>
          <Pressable onPress={() => onSelect(kind.id)}>
            <Text
              style={{
                fontSize: 13,
                fontWeight: "700",
                color: colors.text,
                marginBottom: 8,
              }}
            >
              {kind.title} ({countEntries(kind.groups)})
            </Text>
          </Pressable>
          {kind.groups.map((group) => (
            <Pressable
              key={group.id}
              onPress={() => onSelect(group.id)}
              style={({ pressed }) => ({
                paddingVertical: 4,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Text style={{ fontSize: 14, color: colors.textSecondary }}>
                {group.title}
              </Text>
            </Pressable>
          ))}
        </View>
      ))}
    </ScrollView>
  );
};

/** Dev-only catalog of every Pixy component and block, with sample data. */
export const DesignGuideScreen = () => {
  const colors = useColors();
  const { width } = useWindowDimensions();
  const isWide = width >= WIDE_BREAKPOINT;
  const scrollRef = useRef<ScrollView>(null);
  const offsets = useRef<Record<string, number>>({});
  const { isReady, load } = useLoadFixture();
  const [hasLoaded, setHasLoaded] = useState(false);

  const scrollTo = (id: string) => {
    scrollRef.current?.scrollTo({
      y: offsets.current[id] ?? 0,
      animated: true,
    });
  };

  const loadSampleData = () => {
    const fixture = getFixture("year");
    if (fixture) {
      load(fixture);
      setHasLoaded(true);
    }
  };

  return (
    <View
      style={{
        flex: 1,
        flexDirection: "row",
        backgroundColor: colors.background,
      }}
    >
      {isWide ? <Sidebar onSelect={scrollTo} /> : null}
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: 24,
          maxWidth: 960,
          width: "100%",
          alignSelf: "center",
        }}
      >
        <Text
          style={{
            fontSize: 32,
            fontWeight: "700",
            color: colors.text,
          }}
        >
          Pixy design guide
        </Text>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            flexWrap: "wrap",
            marginTop: 8,
            marginBottom: 32,
          }}
        >
          <Text style={{ fontSize: 15, color: colors.textSecondary }}>
            Live components rendered with the app theme.
          </Text>
          <LinkButton disabled={!isReady || hasLoaded} onPress={loadSampleData}>
            {hasLoaded ? "Sample data loaded" : "Load sample data"}
          </LinkButton>
        </View>

        {KINDS.map((kind) => (
          <View
            key={kind.id}
            onLayout={(event) => {
              offsets.current[kind.id] = event.nativeEvent.layout.y;
            }}
          >
            <Text
              style={{
                fontSize: 26,
                fontWeight: "700",
                color: colors.text,
                marginTop: 16,
              }}
            >
              {kind.title}
            </Text>
            <Text
              style={{
                fontSize: 15,
                color: colors.textSecondary,
                marginTop: 4,
                marginBottom: 24,
              }}
            >
              {kind.description}
            </Text>
            {kind.groups.map((group) => (
              <View
                key={group.id}
                onLayout={(event) => {
                  // Group layout is relative to its kind container.
                  offsets.current[group.id] =
                    (offsets.current[kind.id] ?? 0) +
                    event.nativeEvent.layout.y;
                }}
                style={{ marginBottom: 24 }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                    color: colors.textSecondary,
                    marginBottom: 16,
                    paddingTop: 16,
                    borderTopWidth: 1,
                    borderTopColor: colors.menuListItemBorder,
                  }}
                >
                  {group.title}
                </Text>
                {group.entries.map((entry) => (
                  <Preview
                    key={`${group.id}-${entry.name}`}
                    entry={entry}
                    path={[kind.title, group.title]}
                  />
                ))}
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
};
