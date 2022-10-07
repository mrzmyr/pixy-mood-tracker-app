import { useEffect, useState } from "react";
import { Check, CheckCircle, Repeat, UploadCloud } from "react-native-feather";
import MenuList from "../../components/MenuList";
import MenuListHeadline from "../../components/MenuListHeadline";
import MenuListItem from "../../components/MenuListItem";
import useColors from "../../hooks/useColors";
import { useDatagate } from "../../hooks/useDatagate";

export const UserDataImportList = () => {
  const [users, setUsers] = useState<{
    id: string;
    importData: any;
  }[]>([]);
  const colors = useColors()
  const datagate = useDatagate()

  const [loadedUserIds, setLoadedUserIds] = useState<string[]>([])
  
  const loadUsers = () => {
    fetch("http://10.10.50.143:3000/persons", {
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((res) => res.json())
      .then((res) => {
        setUsers(res);
        setLoadedUserIds([])
      })
  }
  
  useEffect(() => {
    loadUsers()
  }, [])
  
  return (
    <>
    <MenuListHeadline>Load User Data</MenuListHeadline>
    <MenuList
      style={{
      }}
    >
      <MenuListItem
        title={'Reload'}
        iconLeft={<Repeat width={18} color={colors.menuListItemIcon} />}
        onPress={() => {
          
        }}
      />
    </MenuList>
    <MenuList
      style={{
        marginTop: 16,
        marginBottom: 40
      }}
    >
      {users.map((user) => (
        <MenuListItem
          key={user.id}
          title={user.id}
          iconLeft={loadedUserIds.includes(user.id) ? <CheckCircle width={18} color={colors.palette.green[500]} /> : <UploadCloud width={18} color={colors.menuListItemIcon} />}
          onPress={() => {
            datagate.importData(user.importData)
            setLoadedUserIds((loadedUserIds) => [...loadedUserIds, user.id])
          }}
        />
      ))}
    </MenuList>
  </>
  )
}