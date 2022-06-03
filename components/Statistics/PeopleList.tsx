import nlp from 'compromise'
import { Text, View } from 'react-native'
import useColors from '../../hooks/useColors'
import { LogItem } from "../../hooks/useLogs"
import { useTranslation } from '../../hooks/useTranslation'
import { ListEntry } from './ListEntry'

export const PeopleList = ({
  items
}: {
  items: LogItem[]
}) => {
  const { locale } = useTranslation();
  const colors = useColors()
  const text = Object.keys(items).map(key => items[key].message).join('.')
  const post_text = text.toLowerCase().replaceAll(',', '').replace(/[0-9]/g, '.')

  const people = nlp(post_text).people().json()
  const peopleCounts = {}
  people.forEach(person => {
    if(!peopleCounts[person.text]) peopleCounts[person.text] = 0
    peopleCounts[person.text]++
  })

  const mostUsedPersons = Object.keys(peopleCounts)
    .sort((a,b) => peopleCounts[b] - peopleCounts[a])
    .map(name => ({
      name,
      count: peopleCounts[name]
    }))
    .slice(0, 5)

  const localPrefix = locale.split('-')[0]

  if(
    mostUsedPersons.length < 3 ||
    !['en', 'de'].includes(localPrefix)
  ) return null
    
  return (
    <View
      style={{
      }}
    >
      <Text style={{
        fontSize: 17,
        fontWeight: 'bold',
        marginTop: 16,
        marginBottom: 8,
        color: colors.text,
      }}>Most Used Names</Text>
      <View
        style={{
          justifyContent: 'space-between',
          marginTop: 4,
          backgroundColor: colors.cardBackground,
          paddingTop: 8,
          paddingBottom: 8,
          borderRadius: 16,
        }}
      >
        {mostUsedPersons.map((person, index) => (
          <ListEntry
            key={index}
            index={index}
            title={`${person.name[0].toUpperCase()}${person.name.slice(1)}`}
            count={person.count}
            isLast={index === mostUsedPersons.length - 1}
          />
        ))}
      </View>
    </View>
  )
}