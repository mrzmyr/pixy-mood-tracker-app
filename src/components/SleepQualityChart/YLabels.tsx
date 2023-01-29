import { SLEEP_QUALITY_KEYS, SLEEP_QUALITY_MAPPING } from '@/hooks/useLogs';
import { G, Mask, Rect } from 'react-native-svg';

export const YLabels = ({
  relativeY, YLegendWidth, rowHeight, width
}) => {
  return (
    <>
      {[...SLEEP_QUALITY_KEYS].reverse().map((sleepQuality, index) => {
        const y = relativeY(index);

        const height = 16;
        const value = height / 5 * SLEEP_QUALITY_MAPPING[sleepQuality] + SLEEP_QUALITY_MAPPING[sleepQuality];
        const rest = height - value;

        return (
          // @ts-ignore
          <G
            width="8"
            height="16"
            x={(YLegendWidth - 20) / 2}
            y={y + rowHeight / 2 / 2 / 2}
          >
            <Mask
              id={`mask0_1_5${index}`}
              style={{ maskType: 'alpha' }}
              // @ts-ignore
              maskUnits="userSpaceOnUse"
              x="0"
              y="0"
              width="8"
              height="16"
            >
              <Rect
                width="8"
                height="16"
                rx="4"
                transform="matrix(-1 0 0 1 8 0)"
                fill="#FFFFFF"
              />
            </Mask>
            {/* @ts-ignore */}
            <G mask={`url(#mask0_1_5${index})`}>
              <Rect
                width="8"
                height={value}
                transform={`matrix(-1 0 0 1 8 ${rest})`}
                fill="#6466E9"
              />
              <Rect
                width="8"
                height={rest}
                transform={`matrix(-1 0 0 1 8 0)`}
                fill="#E1E7FD"
              />
            </G>
          </G>

        );
      })}
    </>
  );
};
