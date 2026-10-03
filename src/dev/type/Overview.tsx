import { useRouter } from "expo-router";
import { Text, View } from "react-native";
import MenuList from "@/components/MenuList";
import MenuListItem from "@/components/MenuListItem";
import useColors from "@/hooks/useColors";
import { GuidePage, Intro, RoleText, Spec } from "@/dev/type/chrome";
import { TYPE } from "@/dev/type/scale";

const ROLES = Object.values(TYPE);

/**
 * Type guide home: the scale at a glance, then links to each case.
 * Open it from Settings, under Development.
 */
export const TypeOverviewScreen = () => {
  const colors = useColors();
  const router = useRouter();

  return (
    <GuidePage>
      <Intro>
        Line height shrinks as the type gets bigger. Tracking stays at 0. Space
        under a heading is smaller than the space above it. Every gap sits on a
        4-point grid.
      </Intro>
      {ROLES.map((role) => (
        <View key={role.label} style={{ marginTop: 16 }}>
          <RoleText role={role}>{role.label}</RoleText>
          <Spec>{`${role.fontSize} / ${role.lineHeight} · ${role.use}`}</Spec>
        </View>
      ))}
      <Text
        style={{
          color: colors.textSecondary,
          fontSize: 12,
          fontWeight: "600",
          lineHeight: 16,
          marginBottom: 8,
          marginLeft: 16,
          marginTop: 32,
        }}
      >
        Cases
      </Text>
      <MenuList>
        <MenuListItem
          title="Roles"
          isLink
          onPress={() => router.push("/dev/type/roles")}
          testID="dev-type-roles"
        />
        <MenuListItem
          title="Gaps"
          isLink
          onPress={() => router.push("/dev/type/gaps")}
          testID="dev-type-gaps"
        />
        <MenuListItem
          title="Lists"
          isLink
          onPress={() => router.push("/dev/type/lists")}
          testID="dev-type-lists"
        />
        <MenuListItem
          title="Screens"
          isLink
          isLast
          onPress={() => router.push("/dev/type/screens")}
          testID="dev-type-screens"
        />
      </MenuList>
    </GuidePage>
  );
};
