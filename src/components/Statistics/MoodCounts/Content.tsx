import { Text, View } from "react-native";
import useColors from "@/hooks/useColors";
import { RATING_KEYS } from "@/hooks/useLogs";
import { Bar } from "./Bar";

export const Content = ({
  data,
}: {
  data: {
    values: {
      [key: string]: number;
    };
    total: number;
  };
}) => {
  const colors = useColors();

  return (
    <>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          borderBottomColor: colors.cardBorder,
          borderBottomWidth: 1,
          paddingHorizontal: 16,
          marginTop: 16,
        }}
      >
        {[...RATING_KEYS].reverse().map((ratingName) => (
          <Bar
            key={`rating-bar-${ratingName}`}
            // @ts-ignore
            height={data.values[ratingName] / data.total * 400}
            ratingName={ratingName} />
        ))}
      </View>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          paddingHorizontal: 16,
        }}
      >
        {[...RATING_KEYS].reverse().map((ratingName) => (
          <View
            style={{
              alignItems: "center",
              justifyContent: "flex-end",
              flex: RATING_KEYS.length,
              marginHorizontal: 2,
            }}
            key={`rating-count-${ratingName}`}
          >
            <Text
              key={`text-${ratingName}`}
              style={{
                width: '100%',
                marginTop: 8,
                color: colors.text,
                opacity: data.values[ratingName] === 0 ? 0.3 : 1,
                textAlign: "center",
                fontSize: 12,
                fontWeight: "bold",
              }}
            >{data.values[ratingName]}x</Text>
          </View>
        ))}
      </View>
    </>
  );
};
