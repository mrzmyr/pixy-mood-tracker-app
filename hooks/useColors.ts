import Colors from "../constants/Colors";
import { Appearance } from 'react-native';
import { useState } from "react";

export default function useColors() {
  const colorScheme = Appearance.getColorScheme();
  const [colors, setColors] = useState(Colors[colorScheme]);
  
  Appearance.addChangeListener(() => {
    const colorScheme = Appearance.getColorScheme();
    setColors(Colors[colorScheme]);
  })

  return colors;
}
