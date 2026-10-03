import { View } from "react-native";
import { Case, GuidePage, Intro, RoleText, Spec } from "@/dev/type/chrome";
import { MICRO_CAPS, TYPE, formatSpec } from "@/dev/type/scale";

const ROLES = Object.values(TYPE);

/**
 * Each role set in a wrapping sample, plus the two tracking exceptions
 * shown beside the guide value.
 */
export const TypeRolesScreen = () => (
  <GuidePage>
    <Intro>
      Body uses 22 on one line and 24 when the line wraps. Titles step down
      toward 1.2× the size. Tracking stays at 0 on mixed-case type.
    </Intro>
    {ROLES.map((role) => (
      <Case key={role.label} title={role.label}>
        <RoleText role={role}>{role.sample}</RoleText>
        <Spec>{formatSpec({ role })}</Spec>
        <Spec>{role.use}</Spec>
      </Case>
    ))}
    <Case title="All caps, the exception">
      <RoleText role={TYPE.micro}>MOOD</RoleText>
      <Spec>tracking 0</Spec>
      <View style={{ height: 12 }} />
      <RoleText role={MICRO_CAPS}>MOOD</RoleText>
      <Spec>{`${formatSpec({ role: MICRO_CAPS })} · use this on all-caps labels only`}</Spec>
    </Case>
    <Case title="Display tracking, for comparison">
      <RoleText role={TYPE.display}>Privacy</RoleText>
      <Spec>tracking 0 · the guide</Spec>
      <View style={{ height: 12 }} />
      <RoleText role={{ ...TYPE.display, letterSpacing: -0.4 }}>
        Privacy
      </RoleText>
      <Spec>tracking -0.4 · tighter, for comparison</Spec>
    </Case>
  </GuidePage>
);
