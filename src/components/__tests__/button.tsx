import { DefaultTheme, ThemeProvider } from "expo-router";
import { render } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import Button from "@/components/button";
import { ButtonText } from "@/components/button-content";
import LinkButton from "@/components/link-button";
import Colors from "@/constants/colors";

const renderLight = async (ui: React.ReactElement) =>
  await render(
    <ThemeProvider
      value={{
        ...DefaultTheme,
        colors: { ...DefaultTheme.colors, ...Colors.light },
      }}
    >
      {ui}
    </ThemeProvider>
  );

type JsonNode = string | { type: string; children: JsonNode[] | null };
type Node = JsonNode | JsonNode[] | null;

const isRawText = (node: Node): node is string => typeof node === "string";

/** Host types that hold a string child outside `Text`. Native crashes on these. */
const rawTextParents = (node: Node, parent = "root"): string[] => {
  if (node === null) {
    return [];
  }
  if (isRawText(node)) {
    return parent === "Text" ? [] : [parent];
  }
  if (Array.isArray(node)) {
    return node.flatMap((child) => rawTextParents(child, parent));
  }
  return (node.children ?? []).flatMap((child) =>
    rawTextParents(child, node.type)
  );
};

const name = "Klara";

describe.each([
  ["Button", Button],
  ["LinkButton", LinkButton],
])("%s label", (_, Component) => {
  test("text mixed with a variable renders as one Text", async () => {
    const { getByText, toJSON } = await renderLight(
      <Component onPress={() => {}}>
        {"Continue with "}
        {name}
      </Component>
    );

    expect(rawTextParents(toJSON())).toEqual([]);
    expect(getByText("Continue with Klara")).toBeTruthy();
  });

  test("a number renders inside Text", async () => {
    const { getByText, toJSON } = await renderLight(
      <Component onPress={() => {}}>{3}</Component>
    );

    expect(rawTextParents(toJSON())).toEqual([]);
    expect(getByText("3")).toBeTruthy();
  });
});

test("disabled button dims a composed label", async () => {
  const { getByText } = await renderLight(
    <Button type="secondary" disabled onPress={() => {}}>
      <ButtonText weight="400">Morning</ButtonText>
    </Button>
  );

  expect(StyleSheet.flatten(getByText("Morning").props.style).color).toBe(
    Colors.light.secondaryButtonTextDisabled
  );
});
