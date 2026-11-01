import useColors from "@/hooks/use-colors";
import { Copy } from "@/components/typography";

/** Section subtitle on the Statistics tab. */
export const Subtitle = ({ children }: { children: string }) => {
  const colors = useColors();

  return (
    <Copy
      size={16}
      style={{
        letterSpacing: -0.1,
        color: colors.textSecondary,
        marginTop: 8,
      }}
    >
      {children}
    </Copy>
  );
};
