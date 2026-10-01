import Markdown from "react-native-markdown-display";
import useColors from "@/hooks/useColors";

/** Long-form settings copy (privacy, backup) in the app's text colors. */
export const MarkdownBody = ({ children }: { children: string }) => {
  const colors = useColors();

  return (
    <Markdown
      style={{
        body: { color: colors.text, fontSize: 16, lineHeight: 24 },
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
