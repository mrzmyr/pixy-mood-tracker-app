import { Text, View } from "react-native"
import LinkButton from "../../../components/LinkButton"
import { useCalendarFilters } from "../../../hooks/useCalendarFilters"
import useColors from "../../../hooks/useColors"
import { useTranslation } from "../../../hooks/useTranslation"

export const Header = () => {
  const calendarFilters = useCalendarFilters()
  const { t } = useTranslation()
  const colors = useColors()
  
  return (
    <View
      style={{
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        paddingLeft: 16,
        paddingRight: 16,
        paddingTop: 8,
        paddingBottom: 8,
        borderTopEndRadius: 20,
        borderTopStartRadius: 20,
        backgroundColor: colors.bottomSheetHeaderBackground,
        borderBottomColor: colors.bottomSheetHeaderBorder,
        borderBottomWidth: 1,
      }}
    >
      <View style={{
        flex: 1,
      }}></View>
      <Text
        style={{
          flex: 1,
          fontSize: 17,
          textAlign: 'center',
          fontWeight: 'bold',
          color: colors.text,
        }}
      >{t('calendar_filters')}</Text>
      <View
        style={{
          flex: 1,
          flexWrap: 'wrap',
        }}
      >
        <LinkButton
          disabled={!calendarFilters.isFiltering}
          type='secondary'
          style={{
            paddingLeft: 8,
            paddingRight: 8,
            justifyContent: 'flex-end',
          }}
          onPress={() => {
            calendarFilters.set({
              ...calendarFilters.data,
              tagIds: [],
              ratings: [],
              text: '',
            })
          }}
        >{t('calendar_filters_reset')}</LinkButton>
      </View>
    </View>
  )
}