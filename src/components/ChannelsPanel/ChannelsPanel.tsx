import { useEffect, useState, useMemo } from "react";
import type { ChannelMode } from "../../types/image";
import {
  getChannelNames,
  getChannelLabel,
  getChannelAccentColor,
  generateChannelThumbnails,
} from "../../utils/image/channelUtils";
import styles from "./ChannelsPanel.module.scss";

type ChannelsPanelProps = {
  bitmap: ImageBitmap;
  channelMode: ChannelMode;
  enabledChannels: Set<string>;
  onToggleChannel: (channel: string) => void;
};

export default function ChannelsPanel({
  bitmap,
  channelMode,
  enabledChannels,
  onToggleChannel,
}: ChannelsPanelProps) {
  const channelNames = useMemo(
    () => getChannelNames(channelMode),
    [channelMode],
  );

  const [thumbnails, setThumbnails] = useState<Map<string, string>>(
    new Map(),
  );

  useEffect(() => {
    const thumbs = generateChannelThumbnails(bitmap, channelMode);
    setThumbnails(thumbs);
  }, [bitmap, channelMode]);

  return (
    <div className={styles.channelsPanel}>
      <div className={styles.channelsPanel__header}>Каналы</div>

      <ul className={styles.channelsPanel__list}>
        {channelNames.map((channel) => {
          const enabled = enabledChannels.has(channel);
          const thumbSrc = thumbnails.get(channel);
          const accentColor = getChannelAccentColor(channel);

          return (
            <li
              key={channel}
              className={`${styles.channelsPanel__item} ${enabled ? styles.channelsPanel__itemActive : ""}`}
              onClick={() => onToggleChannel(channel)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onToggleChannel(channel);
                }
              }}
            >
              <span
                className={styles.channelsPanel__indicator}
                style={{
                  backgroundColor: enabled ? accentColor : "transparent",
                  borderColor: accentColor,
                }}
              />

              {thumbSrc && (
                <img
                  className={styles.channelsPanel__thumb}
                  src={thumbSrc}
                  alt={getChannelLabel(channel)}
                  draggable={false}
                />
              )}

              <span className={styles.channelsPanel__label}>
                {getChannelLabel(channel)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
