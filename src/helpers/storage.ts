import AsyncStorage from "@react-native-async-storage/async-storage";

export const store = async <State>(key: string, state: State) => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(state));
  } catch (e) {
    console.error(e);
  }
}

export const load = async <ReturnValue>(key: string): Promise<ReturnValue | null> => {
  try {
    const data = await AsyncStorage.getItem(key);
    if(!data) {
      return null;
    }
    return JSON.parse(data);
  } catch (e) {
    console.error(e);
  }

  return null
};
