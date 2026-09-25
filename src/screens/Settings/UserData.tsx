import MenuList from "@/components/MenuList";
import MenuListHeadline from "@/components/MenuListHeadline";
import MenuListItem from "@/components/MenuListItem";
import type { ImportData } from "@/helpers/Import";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { CheckCircle, Repeat, UploadCloud } from "react-native-feather";
import useColors from "../../hooks/useColors";
import { useDatagate } from "../../hooks/useDatagate";

interface User {
  id: string;
  importData: ImportData;
}

export const UserDataImportList = () => {
  const [users, setUsers] = useState<User[]>([]);
  const colors = useColors();
  const datagate = useDatagate();

  const [loadedUserIds, setLoadedUserIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const loadUsers = async () => {
    setLoading(true);

    try {
      const response = await fetch("http://192.168.1.254:3000/persons", {
        headers: {
          "Content-Type": "application/json",
        },
      });
      const userList: User[] = await response.json();
      setUsers(userList);
      setLoadedUserIds([]);
    } catch {
      console.log("Error: Didn't load user list");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadUsers();
  }, []);

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
          onPress={() => loadUsers()}
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
