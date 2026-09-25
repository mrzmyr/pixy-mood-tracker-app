import MenuList from "@/components/MenuList";
import MenuListHeadline from "@/components/MenuListHeadline";
import MenuListItem from "@/components/MenuListItem";
import type { ImportData } from "@/helpers/Import";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { CheckCircle, Repeat, UploadCloud } from "react-native-feather";
import useColors from "../../hooks/useColors";
import { useDatagate } from "../../hooks/useDatagate";

interface User {
  id: string;
  importData: ImportData;
}

/**
 * Development-only list of sample user data sets loaded from a local
 * server on the developer's network; tapping one imports it silently.
 */
export const UserDataImportList = () => {
  const [users, setUsers] = useState<User[]>([]);
  const colors = useColors();
  const datagate = useDatagate();

  const [loadedUserIds, setLoadedUserIds] = useState<string[]>([]);
  // Users load on mount, so the list starts in the loading state.
  const [loading, setLoading] = useState(true);

  const loadUsers = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch("http://192.168.1.254:3000/persons", {
        headers: {
          "Content-Type": "application/json",
        },
        signal,
      });
      const userList: User[] = await response.json();
      setUsers(userList);
      setLoadedUserIds([]);
    } catch {
      console.log("Error: Didn't load user list");
    }
    setLoading(false);
  }, []);

  const reloadUsers = () => {
    setLoading(true);
    void loadUsers();
  };

  useEffect(() => {
    const controller = new AbortController();
    // oxlint-disable-next-line react/set-state-in-effect -- loadUsers only sets state after awaiting the fetch, never synchronously in the effect
    void loadUsers(controller.signal);
    return () => controller.abort();
  }, [loadUsers]);

  const onPress = (user: User) => {
    datagate.import(user.importData, {
      muted: true,
    });
    setLoadedUserIds((currentIds) => [...currentIds, user.id]);
  };

  const loadedUserIdSet = new Set(loadedUserIds);

  return (
    <>
      <MenuListHeadline>Load User Data</MenuListHeadline>
      <MenuList style={{}}>
        <MenuListItem
          title="Reload"
          iconLeft={<Repeat width={18} color={colors.menuListItemIcon} />}
          onPress={reloadUsers}
          isLast
        />
      </MenuList>
      <MenuList
        style={{
          marginTop: 16,
          marginBottom: 40,
        }}
      >
        {loading && (
          <View
            style={{
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
              marginBottom: 8,
              padding: 16,
            }}
          >
            <ActivityIndicator size="small" color={colors.loadingIndicator} />
          </View>
        )}
        {!loading &&
          users.map((user, index) => (
            <MenuListItem
              key={user.id}
              title={user.id}
              iconLeft={
                loadedUserIdSet.has(user.id) ? (
                  <CheckCircle width={18} color={colors.palette.green[500]} />
                ) : (
                  <UploadCloud width={18} color={colors.menuListItemIcon} />
                )
              }
              onPress={() => onPress(user)}
              isLast={index === users.length - 1}
            />
          ))}
      </MenuList>
    </>
  );
};
