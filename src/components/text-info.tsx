import { LIST_INSET } from "@/components/list-inset";
import type { ListTextStyle } from "@/components/list-inset";
import { Copy } from "@/components/typography";
import useColors from "@/hooks/use-colors";

/** Secondary note under a list or field. Starts at the row text, `LIST_INSET`. */
const TextInfo = ({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ListTextStyle;
}) => {
  const colors = useColors();

  return (
    <Copy
      size={13}
      style={[
        {
          color: colors.textSecondary,
          padding: LIST_INSET,
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
