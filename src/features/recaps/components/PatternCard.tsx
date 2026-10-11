import { SegmentedControl } from "@expo/ui/community/segmented-control";
import type { ReactNode } from "react";
import { useState } from "react";
import { View } from "react-native";
import type { LayoutChangeEvent } from "react-native";
import { Caption, Headline } from "@/components/Type";
import { RADIUS } from "@/constants/Radius";
import type { Person } from "@/features/people";
import { TagComponent } from "@/features/tags";
import type { Tag, TagCategory } from "@/features/tags";
import useColors from "@/hooks/useColors";
import { t } from "@/lib/translation";
import type { TranslationKey } from "@/lib/translation";
import { CHIP } from "../chipMarker";
import { formatDelta } from "../format";
import type { EffectRow, PatternCard as PatternCardData } from "../types";
import { RecapCardShell } from "./RecapCardShell";
import { RingedAvatar } from "./RingedAvatar";
import { ChipText, TagChip } from "./TitleChip";

/**
 * Bar from the center: right for lighter days, left for heavier ones.
 * Heavier stays gray, never alarming.
 */
const DivergingBar = ({ delta, scale }: { delta: number; scale: number }) => {
  const colors = useColors();
  const width = `${Math.round((Math.abs(delta) / scale) * 100)}%` as const;
  const bar = {
    width,
    height: 8,
    borderRadius: RADIUS.full,
  } as const;
  return (
    <View style={{ flex: 1, height: 8, flexDirection: "row" }}>
      <View style={{ flex: 1, alignItems: "flex-end" }}>
        {delta < 0 && (
          <View
            style={{
              ...bar,
              backgroundColor: colors.textSecondary,
              opacity: 0.5,
            }}
          />
        )}
      </View>
      <View style={{ width: 1, backgroundColor: colors.cardBorder }} />
      <View style={{ flex: 1 }}>
        {delta >= 0 && (
          <View style={{ ...bar, backgroundColor: colors.moduleMood }} />
        )}
      </View>
    </View>
  );
};

const EffectList = ({
  rows,
  renderLabel,
}: {
  rows: EffectRow[];
  renderLabel: (row: EffectRow) => ReactNode;
}) => {
  const scale = Math.max(...rows.map((row) => Math.abs(row.delta)), 0.5);
  return (
    <View style={{ gap: 12 }}>
      {rows.map((row) => (
        <View
          key={row.id}
          style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
        >
          <View style={{ width: 110 }}>{renderLabel(row)}</View>
          {row.signal === "weak" ? (
            <Caption style={{ flex: 1 }}>
              {t("recaps_no_clear_difference")}
            </Caption>
          ) : (
            <>
              <DivergingBar delta={row.delta} scale={scale} />
              <Caption
                style={{
                  width: 36,
                  textAlign: "right",
                  fontVariant: ["tabular-nums"],
                }}
              >
                {formatDelta(row.delta)}
              </Caption>
            </>
          )}
        </View>
      ))}
    </View>
  );
};

type MovesKind = "tags" | "categories" | "places";

const MOVES_LABELS: Record<MovesKind, TranslationKey> = {
  tags: "logger_step_tags",
  categories: "tag_categories",
  places: "recaps_what_moves_places",
};

const MOVES_KINDS: MovesKind[] = ["tags", "categories", "places"];

/** Tags, categories, and places that go with lighter or heavier days. */
const WhatMoves = ({
  card,
  tags,
  categories,
}: {
  card: Extract<PatternCardData, { type: "what-moves" }>;
  tags: Tag[];
  categories: TagCategory[];
}) => {
  const kinds = MOVES_KINDS.filter((kind) => card[kind].length > 0);
  const [kind, setKind] = useState<MovesKind>(kinds[0] ?? "tags");
  const label = (row: EffectRow): ReactNode => {
    if (kind === "tags") {
      const tag = tags.find((item) => item.id === row.id);
      return tag ? (
        <TagComponent title={tag.title} colorName={tag.color} compact />
      ) : null;
    }
    const name =
      kind === "categories"
        ? categories.find((item) => item.id === row.id)?.title
        : row.label;
    return <Headline>{name ?? ""}</Headline>;
  };
  return (
    <View style={{ gap: 16 }}>
      {kinds.length > 1 && (
        <SegmentedControl
          values={kinds.map((item) => t(MOVES_LABELS[item]))}
          selectedIndex={kinds.indexOf(kind)}
          onChange={(event) => {
            const next = kinds[event.nativeEvent.selectedSegmentIndex];
            if (next) {
              setKind(next);
            }
          }}
          testID="recap-what-moves-kind"
        />
      )}
      <EffectList rows={card[kind]} renderLabel={label} />
    </View>
  );
};

/** Card for a driver that goes with lighter or heavier days. */
export const PatternCard = ({
  card,
  people,
  tags,
  categories,
  footer,
  onLayout,
}: {
  card: PatternCardData;
  people: Person[];
  tags: Tag[];
  categories: TagCategory[];
  footer: ReactNode;
  onLayout?: (event: LayoutChangeEvent) => void;
}) => {
  const shell = {
    type: card.type,
    onLayout,
    footer,
  };
  if (card.type === "stood-out") {
    const tag = tags.find((item) => item.id === card.tagId);
    if (!tag) {
      return null;
    }
    const title = t("recaps_stood_out_title", { count: card.days, tag: CHIP });
    return (
      <RecapCardShell
        {...shell}
        title={<ChipText text={title} chip={<TagChip tag={tag} />} />}
        titleLabel={title.replace(CHIP, tag.title)}
        text={t("recaps_stood_out_text")}
      />
    );
  }
  if (card.type === "what-moves") {
    const title = t("recaps_what_moves_title");
    return (
      <RecapCardShell
        {...shell}
        title={title}
        titleLabel={title}
        text={t("recaps_what_moves_text")}
        body={<WhatMoves card={card} tags={tags} categories={categories} />}
      />
    );
  }
  const title = t("recaps_people_mood_title");
  const known = card.people.filter((row) =>
    people.some((person) => person.id === row.id)
  );
  return (
    <RecapCardShell
      {...shell}
      title={title}
      titleLabel={title}
      text={t("recaps_people_mood_text")}
      body={
        <EffectList
          rows={known}
          renderLabel={(row) => {
            const person = people.find((item) => item.id === row.id);
            return person ? (
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <RingedAvatar person={person} size={28} />
                <Headline>{person.name}</Headline>
              </View>
            ) : null;
          }}
        />
      }
    />
  );
};
