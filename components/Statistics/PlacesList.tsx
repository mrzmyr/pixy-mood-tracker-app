import nlp from 'compromise'
import { Text, View } from 'react-native'
import useColors from '../../hooks/useColors'
import { LogItem } from "../../hooks/useLogs"
import { ListEntry } from './ListEntry'

export const PlacesList = ({
  items
}: {
  items: LogItem[]
}) => {
  const colors = useColors()
  const text = Object.keys(items).map(key => items[key].message).join('.\n')
  const post_text = text.toLowerCase().replaceAll(',', '').replace(/[0-9]/g, ' ')
  
  const places = nlp(post_text).places().json()
  const placesCounts = {}
  places.forEach(person => {
    if(!placesCounts[person.text]) placesCounts[person.text] = 0
    placesCounts[person.text]++
  })

  const mostUsedPlaces = Object.keys(placesCounts)
    .sort((a,b) => placesCounts[b] - placesCounts[a])
    .map(name => ({
      name,
      count: placesCounts[name]
    }))
    .slice(0, 5)
  
  if(mostUsedPlaces.length < 3) return null

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
      }}>Most Used Places</Text>
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
        {mostUsedPlaces.map((person, index) => (
          <ListEntry
            key={index}
            index={index}
            title={`${person.name[0].toUpperCase()}${person.name.slice(1)}`}
            count={person.count}
            isLast={index === mostUsedPlaces.length - 1}
          />
        ))}
      </View>
    </View>
  )
}