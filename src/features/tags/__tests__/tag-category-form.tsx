import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useRouter } from "expo-router";
import { renderRouter, screen } from "expo-router/testing-library";
import { userEvent } from "@testing-library/react-native";
import { Pressable, Text } from "react-native";
import { LogsProvider } from "@/features/logs";
import { AnalyticsProvider } from "@/state/analytics";
import { SettingsProvider } from "@/state/settings";
import { TagCategoryCreate } from "../screens/tag-category-form";
import { STORAGE_KEY, TagsProvider, useTagsState } from "../tags-provider";

/** Lists category titles and opens the create form, like the categories list. */
const CategoriesScreen = () => {
  const router = useRouter();
  const { categories } = useTagsState();
  return (
    <>
      <Pressable onPress={() => router.push("/tags/categories/create")}>
        <Text>Open form</Text>
      </Pressable>
      <Text testID="category-titles">
        {categories.map((category) => category.title).join(",")}
      </Text>
    </>
  );
};

const openCreateForm = async () => {
  await renderRouter(
    {
      _layout: () => (
        <SettingsProvider>
          <AnalyticsProvider>
            <LogsProvider>
              <TagsProvider>
                <Stack />
              </TagsProvider>
            </LogsProvider>
          </AnalyticsProvider>
        </SettingsProvider>
      ),
      "tags/categories/index": CategoriesScreen,
      "tags/categories/create": TagCategoryCreate,
    },
    { initialUrl: "/tags/categories" }
  );
  jest.useRealTimers();
  const user = userEvent.setup();
  await user.press(await screen.findByText("Open form"));
  await screen.findByTestId("tag-category-name");
  return user;
};

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe("tag category form", () => {
  test("user saves a new category with one Save tap while typing", async () => {
    const user = await openCreateForm();
    const input = screen.getByTestId("tag-category-name");

    // `user.type` focuses the input first, as with an open keyboard.
    await user.type(input, "Work");
    await user.press(screen.getByTestId("tag-category-save"));

    expect(await screen.findByTestId("category-titles")).toHaveTextContent(
      "Work",
      { exact: false }
    );
    const stored = JSON.parse(
      (await AsyncStorage.getItem(STORAGE_KEY)) ?? "{}"
    );
    expect(
      stored.categories.map((category: { title: string }) => category.title)
    ).toContain("Work");
  });
});
