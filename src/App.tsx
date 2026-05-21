import { useCallback, useState } from "react";
import MenuBar from "./components/MenuBar/MenuBar";
import Toolbar from "./components/Toolbar/Toolbar";
import CanvasArea from "./components/CanvasArea/CanvasArea";
import ChannelsPanel from "./components/ChannelsPanel/ChannelsPanel";
import EyedropperInfo from "./components/EyedropperInfo/EyedropperInfo";
import StatusBar from "./components/StatusBar/StatusBar";
import LevelsDialog from "./components/LevelsDialog/LevelsDialog";
import { useImageExport } from "./hooks/useImageExport";
import { useImageFile } from "./hooks/useImageFile";
import { getChannelNames } from "./utils/image/channelUtils";
import { imageDataRegistry } from "./utils/image/imageRegistry";
import type { ActiveTool, PixelInfo, OpenedImage } from "./types/image";

import styles from "./App.module.scss";

export default function App() {
  const { openedImage, isLoading, openFile, closeImage, updateImage } = useImageFile();
  const { isExporting, exportFile } = useImageExport(openedImage);

  const [enabledChannels, setEnabledChannels] = useState<Set<string>>(
    new Set(),
  );
  const [activeTool, setActiveTool] = useState<ActiveTool>("none");
  const [pickedPixel, setPickedPixel] = useState<PixelInfo | null>(null);

  const [isLevelsOpen, setIsLevelsOpen] = useState(false);
  const [prevImage, setPrevImage] = useState<OpenedImage | null>(null);

  const [showToolbar, setShowToolbar] = useState(true);
  const [showChannelsPanel, setShowChannelsPanel] = useState(true);

  if (openedImage !== prevImage) {
    setPrevImage(openedImage);
    if (openedImage) {
      setEnabledChannels(new Set(getChannelNames(openedImage.channelMode)));
    } else {
      setEnabledChannels(new Set());
    }
    setPickedPixel(null);
  }

  const handleToggleChannel = useCallback((channel: string) => {
    setEnabledChannels((prev) => {
      const next = new Set(prev);
      if (next.has(channel)) {
        next.delete(channel);
      } else {
        next.add(channel);
      }
      return next;
    });
  }, []);

  const handleApplyLevels = useCallback((newData: ImageData) => {
    updateImage(newData);
  }, [updateImage]);

  return (
    <div className={styles.app}>
      <MenuBar
        onOpenFile={openFile}
        onExportFile={exportFile}
        onCloseImage={closeImage}
        isBusy={isLoading || isExporting}
        canExport={Boolean(openedImage)}
        hasImage={Boolean(openedImage)}
        showToolbar={showToolbar}
        showChannelsPanel={showChannelsPanel}
        onToggleToolbar={() => setShowToolbar(!showToolbar)}
        onToggleChannelsPanel={() => setShowChannelsPanel((v) => !v)}
      />

      <div className={styles.app__workspace}>
        {showToolbar && (
          <Toolbar
            activeTool={activeTool}
            onToolChange={setActiveTool}
            disabled={!openedImage}
            onOpenLevels={() => setIsLevelsOpen(true)}
          />
        )}

        <CanvasArea
          bitmap={openedImage?.bitmap ?? null}
          width={openedImage?.width ?? 0}
          height={openedImage?.height ?? 0}
          channelMode={openedImage?.channelMode ?? null}
          enabledChannels={enabledChannels}
          activeTool={activeTool}
          onPixelPick={setPickedPixel}
        />

        {openedImage && (showChannelsPanel || pickedPixel) && (
          <div className={styles.app__sidebar}>
            {showChannelsPanel && (
              <ChannelsPanel
                bitmap={openedImage.bitmap}
                channelMode={openedImage.channelMode}
                enabledChannels={enabledChannels}
                onToggleChannel={handleToggleChannel}
              />
            )}
            {pickedPixel && <EyedropperInfo pixel={pickedPixel} />}
          </div>
        )}
      </div>

      <StatusBar
        fileName={openedImage?.fileName ?? null}
        width={openedImage?.width ?? 0}
        height={openedImage?.height ?? 0}
        colorDepth={openedImage?.colorDepth ?? 0}
      />

      {isLevelsOpen && (
        <LevelsDialog
          isOpen={isLevelsOpen}
          channelMode={openedImage?.channelMode ?? null}
          originalImageData={openedImage?.bitmap ? imageDataRegistry.get(openedImage.bitmap) ?? null : null}
          onClose={() => setIsLevelsOpen(false)}
          onApply={handleApplyLevels}
        />
      )}
    </div>
  );
}