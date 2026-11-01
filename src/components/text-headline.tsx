import type { TextStyle } from "react-native";

import { Label } from "@/components/typography";
import useColors from "@/hooks/use-colors";

const DEFAULT_STYLE = {};

const TextHeadline = ({
  children,
  style = DEFAULT_STYLE,
}: {
  children: React.ReactNode;
  style?: TextStyle;
}) => {
  const colors = useColors();
  return (
    <Label
      size={16}
      style={[
        {
          fontWeight: "bold",
          color: colors.text,
        },
        style,
      ]}
    >
      {children}
    </Label>
  );
};

export default TextHeadline;
