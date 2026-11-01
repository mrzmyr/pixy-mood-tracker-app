import useColors from "@/hooks/use-colors";
import { Heading } from "@/components/typography";

/** Section title on the Statistics tab. */
export const Title = ({ children }: { children: string }) => {
  const colors = useColors();

  return (
    <Heading
      size={20}
      accessibilityRole="header"
      style={{
        color: colors.text,
        fontWeight: "bold",
        marginTop: 16,
      }}
    >
      {children}
    </Heading>
  );
};
