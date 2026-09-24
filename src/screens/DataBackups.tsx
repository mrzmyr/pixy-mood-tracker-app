import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text } from 'react-native';
import { Clock } from 'react-native-feather';
import dayjs from 'dayjs';
import Alert from '@/components/Alert';
import MenuList from '@/components/MenuList';
import MenuListItem from '@/components/MenuListItem';
import { PageWithHeaderLayout } from '@/components/PageWithHeaderLayout';
import TextInfo from '@/components/TextInfo';
import { LogSnapshot, listLogSnapshots, readLogSnapshot } from '@/helpers/logSnapshots';
import { alertStorageError } from '@/helpers/prompts';
import { t } from '@/helpers/translation';
import { useAnalytics } from '@/hooks/useAnalytics';
import useColors from '@/hooks/useColors';
import { LogItem, useLogState, useLogUpdater } from '@/hooks/useLogs';
import { RootStackScreenProps } from '../../types';

interface BackupRow {
  snapshot: LogSnapshot;
  items: LogItem[];
  missingCount: number;
}

export const DataBackupsScreen = ({ navigation }: RootStackScreenProps<'DataBackups'>) => {
  const colors = useColors()
  const analytics = useAnalytics()
  const logState = useLogState()
  const logUpdater = useLogUpdater()

  const [rows, setRows] = useState<BackupRow[] | null>(null)

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const existingIds = new Set(logState.items.map((item) => item.id))
      const next: BackupRow[] = []

      try {
        for (const snapshot of await listLogSnapshots()) {
          try {
            const { items } = await readLogSnapshot(snapshot)
            const logItems = items as LogItem[]
            next.push({
              snapshot,
              items: logItems,
              missingCount: logItems.filter((item) => !existingIds.has(item.id)).length,
            })
          } catch {
            // Unreadable backups are left out; others stay restorable.
          }
        }
      } catch (error) {
        alertStorageError(error)
      }

      if (!cancelled) setRows(next)
    })()

    return () => { cancelled = true }
  }, [JSON.stringify(logState.items.map((item) => item.id))])

  const restore = (row: BackupRow) => {
    const date = dayjs(row.snapshot.date).format('LL')

    Alert.alert(
      t('data_backups_restore_confirm_title'),
      t('data_backups_restore_confirm_message', { date, count: row.missingCount }),
      [
        {
          text: t('data_backups_restore_button'),
          onPress: () => {
            logUpdater.restoreLogs(row.items)
              .then(() => {
                analytics.track('data_backup_restored', { missingCount: row.missingCount })
                Alert.alert(
                  t('data_backups_restore_success_title'),
                  t('data_backups_restore_success_message', { count: row.missingCount }),
                  [{ text: t('ok'), onPress: () => navigation.goBack() }],
                )
              })
              .catch((error) => alertStorageError(error))
          },
        },
        { text: t('cancel'), style: 'cancel' },
      ],
    )
  }

  return (
    <PageWithHeaderLayout
      style={{
        flex: 1,
        backgroundColor: colors.background,
      }}>
      <ScrollView
        style={{
          padding: 20,
          flex: 1,
        }}
      >
        {rows === null && <ActivityIndicator style={{ marginTop: 32 }} />}
        {rows !== null && rows.length === 0 && (
          <TextInfo style={{ marginTop: 16 }}>{t('data_backups_empty')}</TextInfo>
        )}
        {rows !== null && rows.length > 0 && (
          <>
            <MenuList style={{ marginTop: 16 }}>
              {rows.map((row, index) => (
                <MenuListItem
                  key={row.snapshot.uri}
                  testID={`data-backup-${row.snapshot.date}`}
                  title={dayjs(row.snapshot.date).format('LL')}
                  onPress={row.missingCount > 0 ? () => restore(row) : null}
                  deactivated={row.missingCount === 0}
                  iconLeft={<Clock width={18} color={colors.menuListItemIcon} />}
                  iconRight={
                    <Text style={{ color: colors.textSecondary, fontSize: 15 }}>
                      {row.missingCount > 0
                        ? t('data_backups_missing_count', { count: row.missingCount })
                        : t('data_backups_nothing_missing')}
                    </Text>
                  }
                  isLast={index === rows.length - 1}
                />
              ))}
            </MenuList>
            <TextInfo>{t('data_backups_help')}</TextInfo>
          </>
        )}
      </ScrollView>
    </PageWithHeaderLayout>
  );
}
