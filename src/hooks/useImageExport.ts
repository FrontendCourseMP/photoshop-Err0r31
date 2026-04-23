import { useCallback, useState } from "react";
import type { ExportFormat, OpenedImage } from "../types/image";
import { yieldToBrowserFrame } from "../utils/scheduler";
import { exportOpenedImage } from "../utils/image/exportImage";

type UseImageExportResult = {
  isExporting: boolean;
  exportFile: (format: ExportFormat) => Promise<void>;
};

export function useImageExport(openedImage: OpenedImage | null): UseImageExportResult {
  const [isExporting, setIsExporting] = useState(false);

  const exportFile = useCallback(
    async (format: ExportFormat) => {
      if (!openedImage) {
        throw new Error("Нет изображения для сохранения.");
      }

      setIsExporting(true);

      try {
        await yieldToBrowserFrame();
        await exportOpenedImage(openedImage, format);
      } finally {
        setIsExporting(false);
      }
    },
    [openedImage],
  );

  return {
    isExporting,
    exportFile,
  };
}
