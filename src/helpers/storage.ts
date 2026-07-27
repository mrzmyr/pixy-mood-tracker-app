import AsyncStorage from "@react-native-async-storage/async-storage";

export const store = async <State>(key: string, state: State) => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(state));
  } catch (error) {
    console.error(error);
  }
};

export const load = async <ReturnValue>(
  key: string
): Promise<ReturnValue | null> => {
  const data = await AsyncStorage.getItem(key);
  if (data === null) {
    return null;
  }

  return JSON.parse(data);
};
