import dayjs from "dayjs";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import Check from "lucide-react-native/icons/check";
import Plus from "lucide-react-native/icons/plus";
import { v4 as uuidv4 } from "uuid";
import Button from "@/components/button";
import { HeaderButton } from "@/components/header-button";
import MenuList from "@/components/menu-list";
import MenuListItem from "@/components/menu-list-item";
import ModalHeader from "@/components/modal-header";
import { SheetModal } from "@/components/sheet-modal";
import { Copy, Heading } from "@/components/typography";
import { SleepQualityMeter } from "@/features/logger";
import { useLogState, useLogUpdater } from "@/features/logs";
import {
  GENERAL_CATEGORY_ID,
  TagListItem,
  TagNameField,
  useCanCreateTag,
  useTagsState,
  useTagsUpdater,
} from "@/features/tags";
import type { Tag } from "@/features/tags";
import useColors from "@/hooks/use-colors";
import { t } from "@/lib/translation";
import type { RoughNight } from "./types";

/** What the user added: the tag, new or existing, and on how many evenings. */
export interface MissedTag {
  tagId: string;
  isNew: boolean;
  evenings: number;
}

/** Title and hint at the top of a step, wraps instead of cutting off. */
const SheetTitle = ({ title, hint }: { title: string; hint: string }) => {
  const colors = useColors();
  return (
    <View style={{ gap: 4 }}>
      <Heading
        size={24}
        accessibilityRole="header"
        style={{ color: colors.text }}
      >
        {title}
      </Heading>
      <Copy size={14} style={{ color: colors.textSecondary }}>
        {hint}
      </Copy>
    </View>
  );
};

type Step =
  | { kind: "pick" }
  | { kind: "evenings"; tag: Tag; isNew: boolean; evenings: Set<string> };

/**
 * "I missed a tag" on the rough-nights question. Step 1: pick a tag the
 * user already has, or create one. Step 2: add it to some of the rough
 * evenings, or skip. The tag then counts as the user's answer. A new tag
 * is created only when the user confirms, never on the way.
 */
export const MissedTagSheet = ({
  visible,
  roughNights,
  shownTagIds,
  onClose,
  onAdded,
}: {
  visible: boolean;
  roughNights: RoughNight[];
  /** Tags already on the question: not offered again. */
  shownTagIds: ReadonlySet<string>;
  onClose: () => void;
  onAdded: (missed: MissedTag) => void;
}) => {
  const colors = useColors();
  const { tags } = useTagsState();
  const tagsUpdater = useTagsUpdater();
  const { items } = useLogState();
  const logUpdater = useLogUpdater();
  const canCreate = useCanCreateTag(tags);
  const [query, setQuery] = useState("");
  const [step, setStep] = useState<Step>({ kind: "pick" });
  const [firstColor] = Object.keys(colors.tags);

  const reset = () => {
    setQuery("");
    setStep({ kind: "pick" });
  };
  const close = () => {
    reset();
    onClose();
  };

  const name = query.trim();
  const choices = tags.filter(
    (tag) =>
      !tag.isArchived &&
      !shownTagIds.has(tag.id) &&
      tag.title.toLowerCase().includes(name.toLowerCase())
  );
  const isTaken = tags.some(
    (tag) => tag.title.toLowerCase() === name.toLowerCase()
  );

  /** Adds the tag to the last entry of each chosen evening. */
  const finish = (
    current: Extract<Step, { kind: "evenings" }>,
    add: boolean
  ) => {
    if (current.isNew) {
      tagsUpdater.createTag(current.tag);
    }
    const evenings = add ? current.evenings : new Set<string>();
    for (const date of evenings) {
      const [last] = items
        .filter((item) => item.date === date)
        .sort((a, b) => b.dateTime.localeCompare(a.dateTime));
      if (last && !last.tags.some(({ id }) => id === current.tag.id)) {
        logUpdater.editLog({
          id: last.id,
          tags: [...last.tags, { id: current.tag.id }],
        });
      }
    }
    onAdded({
      tagId: current.tag.id,
      isNew: current.isNew,
      evenings: evenings.size,
    });
    reset();
  };

  const background = colors.feedbackBackground;
  const addLabel =
    step.kind === "evenings"
      ? t("recaps_story_missed_add", { count: step.evenings.size })
      : "";
  return (
    <SheetModal visible={visible} onClose={close} backgroundColor={background}>
      <View style={{ flex: 1, backgroundColor: background }}>
        {/* Title sits in the body: the header's middle slot cuts long titles. */}
        <ModalHeader
          left={
            <HeaderButton
              kind="cancel"
              label={t("close")}
              onPress={close}
              testID="recap-missed-close"
            />
          }
        />
        {step.kind === "pick" ? (
          <ScrollView
            contentContainerStyle={{ padding: 16, gap: 16 }}
            keyboardShouldPersistTaps="handled"
          >
            <SheetTitle
              title={t("recaps_story_missed_title")}
              hint={t("recaps_story_missed_hint")}
            />
            <TagNameField
              value={query}
              onChange={setQuery}
              placeholder={t("recaps_story_missed_search")}
              testID="recap-missed-search"
              showError={false}
              autoFocus
            />
            <MenuList>
              {canCreate && name.length > 0 && !isTaken && (
                <MenuListItem
                  title={t("recaps_story_missed_create", { name })}
                  tone="action"
                  iconLeft={<Plus width={18} height={18} color={colors.tint} />}
                  onPress={() =>
                    setStep({
                      kind: "evenings",
                      isNew: true,
                      evenings: new Set(),
                      tag: {
                        id: uuidv4(),
                        title: name,
                        // SAFETY: tag color keys come from the same palette as Tag["color"].
                        color: firstColor as Tag["color"],
                        categoryId: GENERAL_CATEGORY_ID,
                      },
                    })
                  }
                  testID="recap-missed-create"
                />
              )}
              {choices.map((tag) => (
                <TagListItem
                  key={tag.id}
                  tag={tag}
                  onPress={() =>
                    setStep({
                      kind: "evenings",
                      isNew: false,
                      evenings: new Set(),
                      tag,
                    })
                  }
                />
              ))}
            </MenuList>
          </ScrollView>
        ) : (
          <>
            <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
              <SheetTitle
                title={t("recaps_story_missed_evenings_title")}
                hint={t("recaps_story_missed_evenings_hint", {
                  tag: step.tag.title,
                })}
              />
              <MenuList>
                {roughNights.map((night) => {
                  const isOn = step.evenings.has(night.evening);
                  return (
                    <MenuListItem
                      key={night.evening}
                      title={dayjs(night.evening).format("dddd, D MMMM")}
                      checked={isOn}
                      iconLeft={
                        <SleepQualityMeter value={night.quality} height={24} />
                      }
                      iconRight={
                        isOn ? (
                          <Check width={20} height={20} color={colors.tint} />
                        ) : (
                          <View style={{ width: 20 }} />
                        )
                      }
                      onPress={() => {
                        const evenings = new Set(step.evenings);
                        if (isOn) {
                          evenings.delete(night.evening);
                        } else {
                          evenings.add(night.evening);
                        }
                        setStep({ ...step, evenings });
                      }}
                      testID={`recap-missed-evening-${night.evening}`}
                    />
                  );
                })}
              </MenuList>
            </ScrollView>
            <View style={{ flexDirection: "row", gap: 12, padding: 16 }}>
              <View style={{ flex: 1 }}>
                <Button
                  type="tertiary"
                  onPress={() => finish(step, false)}
                  testID="recap-missed-skip"
                >
                  {t("recaps_story_missed_not_now")}
                </Button>
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  type="primary"
                  disabled={step.evenings.size === 0}
                  onPress={() => finish(step, true)}
                  testID="recap-missed-add"
                >
                  {addLabel}
                </Button>
              </View>
            </View>
          </>
        )}
      </View>
    </SheetModal>
  );
};
