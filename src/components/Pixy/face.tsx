import { ClipPath, Defs, RadialGradient, Rect, Stop } from "react-native-svg";

/**
 * Gradient definitions for the Tangerine app icon. `id` must be unique per
 * rendered Pixy; it prefixes the clip path (`<id>clip`) and gradients.
 */
export const PixyDefs = ({ id }: { id: string }) => (
  <Defs>
    <ClipPath id={`${id}clip`}>
      <Rect width={100} height={100} rx={24} />
    </ClipPath>
    <RadialGradient id={`${id}a`} cx="25%" cy="25%" r="60%">
      <Stop offset={0} stopColor="#FFC23D" />
      <Stop offset={1} stopColor="#FFC23D" stopOpacity={0} />
    </RadialGradient>
    <RadialGradient id={`${id}b`} cx="80%" cy="72%" r="70%">
      <Stop offset={0} stopColor="#FF4D00" />
      <Stop offset={1} stopColor="#FF4D00" stopOpacity={0} />
    </RadialGradient>
    <RadialGradient id={`${id}c`} cx="65%" cy="15%" r="40%">
      <Stop offset={0} stopColor="#FFE08A" stopOpacity={0.7} />
      <Stop offset={1} stopColor="#FFE08A" stopOpacity={0} />
    </RadialGradient>
  </Defs>
);

/** Tangerine squircle fill. Render inside the `<id>clip` clip path. */
export const PixyBackground = ({ id }: { id: string }) => (
  <>
    <Rect width={100} height={100} fill="#FB6B0F" />
    <Rect width={100} height={100} fill={`url(#${id}a)`} />
    <Rect width={100} height={100} fill={`url(#${id}b)`} />
    <Rect width={100} height={100} fill={`url(#${id}c)`} />
  </>
);
