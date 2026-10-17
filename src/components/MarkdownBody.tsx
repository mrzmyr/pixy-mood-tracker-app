import Markdown from "react-native-markdown-display";
import useColors from "@/hooks/useColors";

/**
 * Long-form settings copy (privacy, backup) in the app's text colors.
 * `subtle` renders small secondary-color text, like `TextInfo`, for notes
 * below a list. Bullets take the same color as the text.
 */
export const MarkdownBody = ({
  children,
  subtle = false,
}: {
  children: string;
  subtle?: boolean;
}) => {
  const colors = useColors();
  const textColor = subtle ? colors.textSecondary : colors.text;

  return (
    <Markdown
      style={{
        body: subtle
          ? { color: textColor, fontSize: 13, lineHeight: 19 }
          : { color: textColor, fontSize: 16, lineHeight: 24 },
        bullet_list_icon: { color: textColor },
        heading3: {
          fontWeight: "bold",
          fontSize: 21,
          lineHeight: 28,
          marginBottom: 0,
          marginTop: 20,
        },
        list_item: { marginTop: 5, marginLeft: -5 },
        bullet_list: { marginBottom: 10 },
        hr: {
          backgroundColor: colors.text,
          marginTop: 20,
          marginBottom: 20,
          opacity: 0.2,
        },
        em: { color: colors.text, opacity: 0.5, fontStyle: "normal" },
      }}
    >
      {children}
    </Markdown>
  );
};
