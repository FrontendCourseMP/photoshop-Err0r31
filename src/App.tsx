import { useCallback, useEffect, useState } from "react";
import MenuBar from "./components/MenuBar/MenuBar";
import Toolbar from "./components/Toolbar/Toolbar";
import CanvasArea from "./components/CanvasArea/CanvasArea";
import ChannelsPanel from "./components/ChannelsPanel/ChannelsPanel";
import EyedropperInfo from "./components/EyedropperInfo/EyedropperInfo";
import StatusBar from "./components/StatusBar/StatusBar";
import LevelsDialog from "./components/LevelsDialog/LevelsDialog";
import ResizeDialog from "./components/ResizeDialog/ResizeDialog";
import FilterDialog from "./components/FilterDialog/FilterDialog";
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
  const [isResizeOpen, setIsResizeOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [prevImage, setPrevImage] = useState<OpenedImage | null>(null);

  const [showToolbar, setShowToolbar] = useState(true);
  const [showChannelsPanel, setShowChannelsPanel] = useState(true);

  const [visualScale, setVisualScale] = useState<number>(1);
  const [layoutScale, setLayoutScale] = useState<number>(1);
  const [visualAlgorithmId, setVisualAlgorithmId] = useState<string>("bilinear");
  const [fitTrigger, setFitTrigger] = useState(0);
  const [previewImageData, setPreviewImageData] = useState<ImageData | null>(null);

  if (openedImage !== prevImage) {
    setPrevImage(openedImage);
    if (openedImage) {
      setEnabledChannels(new Set(getChannelNames(openedImage.channelMode)));
      setVisualScale(1);
      setLayoutScale(1);
      setFitTrigger((v) => v + 1);
    } else {
      setEnabledChannels(new Set());
    }
    setPickedPixel(null);
    setPreviewImageData(null);
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisualScale(layoutScale);
    }, 150);
    return () => clearTimeout(timer);
  }, [layoutScale]);

  const handleScaleChange = useCallback((scale: number, immediate = false) => {
    setLayoutScale(scale);
    if (immediate) {
      setVisualScale(scale);
    }
  }, []);

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

  const handleApplyResize = useCallback((newData: ImageData) => {
    updateImage(newData);
  }, [updateImage]);

  const handleApplyFilter = useCallback((newData: ImageData) => {
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
            onOpenResize={() => setIsResizeOpen(true)}
            onOpenFilter={() => setIsFilterOpen(true)}
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
          visualScale={visualScale}
          layoutScale={layoutScale}
          visualAlgorithmId={visualAlgorithmId}
          onScaleChange={handleScaleChange}
          fitTrigger={fitTrigger}
          previewImageData={previewImageData}
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
        displayScale={layoutScale}
        onScaleChange={handleScaleChange}
        visualAlgorithmId={visualAlgorithmId}
        onAlgorithmChange={setVisualAlgorithmId}
        onAutoFit={() => setFitTrigger((v) => v + 1)}
      />

      {isLevelsOpen && (
        <LevelsDialog
          isOpen={isLevelsOpen}
          channelMode={openedImage?.channelMode ?? null}
          originalImageData={openedImage?.bitmap ? imageDataRegistry.get(openedImage.bitmap) ?? null : null}
          onClose={() => setIsLevelsOpen(false)}
          onApply={handleApplyLevels}
          onPreview={setPreviewImageData}
        />
      )}

      {isResizeOpen && (
        <ResizeDialog
          isOpen={isResizeOpen}
          originalImageData={openedImage?.bitmap ? imageDataRegistry.get(openedImage.bitmap) ?? null : null}
          onClose={() => setIsResizeOpen(false)}
          onApply={handleApplyResize}
        />
      )}

      {isFilterOpen && (
        <FilterDialog
          isOpen={isFilterOpen}
          channelMode={openedImage?.channelMode ?? null}
          originalImageData={openedImage?.bitmap ? imageDataRegistry.get(openedImage.bitmap) ?? null : null}
          onClose={() => setIsFilterOpen(false)}
          onApply={handleApplyFilter}
          onPreview={setPreviewImageData}
        />
      )}
    </div>
  );
}