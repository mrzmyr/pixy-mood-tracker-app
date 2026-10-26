import { Fragment, createContext, useContext } from "react";
import type { ComponentType, ReactNode } from "react";
import type { ColorValue, TextStyle } from "react-native";

import { Label } from "@/components/type";

interface ButtonContextValue {
  /** Label and icon color. Already the disabled color when disabled. */
  color: ColorValue;
  disabled: boolean;
  /** Label style of the button kind, for example `fontWeight`. */
  textStyle: TextStyle;
}

const ButtonContext = createContext<ButtonContextValue>({
  color: "black",
  disabled: false,
  textStyle: {},
});

/** Set by `Button` and `LinkButton`. Gives `ButtonText` and `ButtonIcon` their color. */
export const ButtonProvider = ({
  value,
  children,
}: {
  value: ButtonContextValue;
  children: ReactNode;
}) => <ButtonContext.Provider value={value}>{children}</ButtonContext.Provider>;

/**
 * Button label on the `Label` type role, in the button's color.
 * One line by default.
 */
export const ButtonText = ({
  children,
  weight,
  numberOfLines = 1,
  style,
}: {
  children: ReactNode;
  weight?: TextStyle["fontWeight"];
  /** `0` lets the label wrap. */
  numberOfLines?: number;
  /** One-off size or alignment. Color comes from the button. */
  style?: TextStyle;
}) => {
  const { color, textStyle } = useContext(ButtonContext);

  return (
    <Label
      numberOfLines={numberOfLines === 0 ? undefined : numberOfLines}
      style={{
        ...textStyle,
        color,
        ...(weight === undefined ? null : { fontWeight: weight }),
        ...style,
      }}
    >
      {children}
    </Label>
  );
};

type IconComponent = ComponentType<{
  width?: number;
  height?: number;
  color?: ColorValue;
  strokeWidth?: number;
}>;

/** Icon in the button's color. Feather and Lucide icons fit. */
export const ButtonIcon = ({
  icon: Icon,
  size = 20,
  strokeWidth,
}: {
  icon: IconComponent;
  size?: number;
  strokeWidth?: number;
}) => {
  const { color } = useContext(ButtonContext);

  return (
    <Icon
      width={size}
      height={size}
      color={color}
      // Feather icons spread props over their defaults: never pass undefined.
      {...(strokeWidth === undefined ? null : { strokeWidth })}
    />
  );
};

const isTextNode = (node: ReactNode): node is string | number =>
  typeof node === "string" || typeof node === "number";

const isNodeList = (node: ReactNode): node is ReactNode[] =>
  Array.isArray(node);

/** Children React renders as nothing. */
const isEmptyNode = (node: ReactNode): node is null | undefined | boolean =>
  node === null || node === undefined || node === true || node === false;

/** Flattens nested child arrays. Drops `null`, `undefined`, and booleans. */
const flattenChildren = (node: ReactNode, out: ReactNode[] = []) => {
  if (isNodeList(node)) {
    for (const child of node) {
      flattenChildren(child, out);
    }
  } else if (!isEmptyNode(node)) {
    out.push(node);
  }
  return out;
};

/**
 * Wraps each run of strings and numbers in `ButtonText`, so no raw text
 * renders outside `Text` (a native crash). Elements render as they are.
 * Keeps `<Button>{t("save")}</Button>` working; compose `ButtonText` and
 * `ButtonIcon` for anything else.
 */
export const ButtonChildren = ({ children }: { children: ReactNode }) => {
  const parts: ReactNode[] = [];
  let run: (string | number)[] = [];

  const flushRun = () => {
    if (run.length > 0) {
      parts.push(<ButtonText>{run.join("")}</ButtonText>);
      run = [];
    }
  };

  for (const child of flattenChildren(children)) {
    if (isTextNode(child)) {
      run.push(child);
    } else {
      flushRun();
      parts.push(child);
    }
  }
  flushRun();

  return (
    <>
      {parts.map((part, index) => (
        // Parts keep their order and never move: the index is a stable key.
        <Fragment key={index}>{part}</Fragment>
      ))}
    </>
  );
};
