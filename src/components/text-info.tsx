import type { TextStyle } from "react-native";

import { Copy } from "@/components/typography";
import useColors from "@/hooks/use-colors";

/** Secondary note under a list, for example a warning about its rows. */
const TextInfo = ({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: TextStyle;
}) => {
  const colors = useColors();

  return (
    <Copy
      size={13}
      style={[
        {
          color: colors.textSecondary,
          padding: 16,
          paddingTop: 0,
        },
        style,
      ]}
    >
      {children}
    </Copy>
  );
};

export default TextInfo;
