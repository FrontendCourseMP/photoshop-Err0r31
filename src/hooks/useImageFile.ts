import { useCallback, useEffect, useState } from "react";
import type { OpenedImage } from "../types/image";
import { yieldToBrowserFrame } from "../utils/scheduler";
import { decodeRasterFile, isSupportedRasterFile } from "../utils/imageFile";

type UseImageFileResult = {
  openedImage: OpenedImage | null;
  isLoading: boolean;
  openFile: (file: File) => Promise<void>;
  closeImage: () => void;
};

export function useImageFile(): UseImageFileResult {
  const [openedImage, setOpenedImage] = useState<OpenedImage | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    return () => {
      if (openedImage) {
        openedImage.bitmap.close();
      }
    };
  }, [openedImage]);

  const openFile = useCallback(async (file: File) => {
    if (!isSupportedRasterFile(file)) {
      throw new Error("Поддерживаются только PNG, JPG/JPEG и GB7 файлы.");
    }

    setIsLoading(true);

    try {
      // Let the dropdown close and UI paint before decode starts.
      await yieldToBrowserFrame();

      const decodedImage = await decodeRasterFile(file);
      setOpenedImage((previousImage) => {
        previousImage?.bitmap.close();
        return decodedImage;
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const closeImage = useCallback(() => {
    setOpenedImage((previousImage) => {
      previousImage?.bitmap.close();
      return null;
    });
  }, []);

  return {
    openedImage,
    isLoading,
    openFile,
    closeImage,
  };
}
