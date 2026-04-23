import MenuBar from "./components/MenuBar/MenuBar";
import CanvasArea from "./components/CanvasArea/CanvasArea";
import StatusBar from "./components/StatusBar/StatusBar";
import { useImageExport } from "./hooks/useImageExport";
import { useImageFile } from "./hooks/useImageFile";

import styles from "./App.module.scss";

export default function App() {
  const { openedImage, isLoading, openFile, closeImage } = useImageFile();
  const { isExporting, exportFile } = useImageExport(openedImage);

  return (
    <div className={styles.app}>
      <MenuBar
        onOpenFile={openFile}
        onExportFile={exportFile}
        onCloseImage={closeImage}
        isBusy={isLoading || isExporting}
        canExport={Boolean(openedImage)}
        hasImage={Boolean(openedImage)}
      />

      <div className={styles.app__workspace}>
        <CanvasArea
          bitmap={openedImage?.bitmap ?? null}
          width={openedImage?.width ?? 0}
          height={openedImage?.height ?? 0}
        />
      </div>

      <StatusBar
        fileName={openedImage?.fileName ?? null}
        width={openedImage?.width ?? 0}
        height={openedImage?.height ?? 0}
        colorDepth={openedImage?.colorDepth ?? 0}
      />
    </div>
  );
}