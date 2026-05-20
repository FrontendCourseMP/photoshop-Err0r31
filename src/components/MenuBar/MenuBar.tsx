import { useEffect, useRef, useState, type ChangeEvent } from "react";
import type { ExportFormat } from "../../types/image";
import styles from "./MenuBar.module.scss";

type MenuBarProps = {
  onOpenFile: (file: File) => Promise<void>;
  onExportFile: (format: ExportFormat) => Promise<void>;
  onCloseImage: () => void;
  isBusy: boolean;
  canExport: boolean;
  hasImage: boolean;
};

export default function MenuBar({
  onOpenFile,
  onExportFile,
  onCloseImage,
  isBusy,
  canExport,
  hasImage,
  showToolbar,
  showChannelsPanel,
  onToggleToolbar,
  onToggleChannelsPanel,
}: MenuBarProps & {
  showToolbar: boolean;
  showChannelsPanel: boolean;
  onToggleToolbar: () => void;
  onToggleChannelsPanel: () => void;
}) {
  const [openMenu, setOpenMenu] = useState<"file" | "tools" | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenMenu(null);
      }
    }

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current) {
        return;
      }

      if (!containerRef.current.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, []);

  function handleOpenClick() {
    fileInputRef.current?.click();
  }

  async function handleFileInputChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.target;
    const file = input.files?.[0];
    input.value = "";

    if (!file) {
      return;
    }

    try {
      await onOpenFile(file);
      setOpenMenu(null);
    } catch (error) {
      const fallback = "Ошибка при открытии изображения.";
      const message = error instanceof Error ? error.message : fallback;
      window.alert(message);
    }
  }

  async function handleExportClick(format: ExportFormat) {
    try {
      await onExportFile(format);
      setOpenMenu(null);
    } catch (error) {
      const fallback = "Ошибка при сохранении изображения.";
      const message = error instanceof Error ? error.message : fallback;
      window.alert(message);
    }
  }

  function handleCloseImageClick() {
    onCloseImage();
    setOpenMenu(null);
  }

  return (
    <div className={styles.menuBar} ref={containerRef}>
      <input
        ref={fileInputRef}
        className={styles.menuBar__fileInput}
        type="file"
        accept=".png,.jpg,.jpeg,.gb7,image/png,image/jpeg"
        onChange={handleFileInputChange}
      />

      <div className={styles.menuBar__item}>
        <button
          className={styles.menuBar__button}
          onClick={() => setOpenMenu((v) => (v === "file" ? null : "file"))}
        >
          Файл
        </button>

        {openMenu === "file" && (
          <ul className={styles.dropdown}>
            <li className={styles.dropdown__item}>
              <button className={styles.dropdown__button} onClick={handleOpenClick}>
                Открыть
              </button>
            </li>
            <li className={styles.dropdown__separator} />
            <li className={styles.dropdown__item}>
              <button
                className={styles.dropdown__button}
                disabled={!canExport || isBusy}
                onClick={() => handleExportClick("png")}
              >
                Сохранить как PNG
              </button>
            </li>
            <li className={styles.dropdown__item}>
              <button
                className={styles.dropdown__button}
                disabled={!canExport || isBusy}
                onClick={() => handleExportClick("jpg")}
              >
                Сохранить как JPG
              </button>
            </li>
            <li className={styles.dropdown__item}>
              <button
                className={styles.dropdown__button}
                disabled={!canExport || isBusy}
                onClick={() => handleExportClick("gb7")}
              >
                Сохранить как GB7
              </button>
            </li>
            <li className={styles.dropdown__separator} />
            <li className={styles.dropdown__item}>
              <button
                className={styles.dropdown__button}
                disabled={!hasImage}
                onClick={handleCloseImageClick}
              >
                Закрыть
              </button>
            </li>
          </ul>
        )}
      </div>

      <div className={styles.menuBar__item}>
        <button
          className={styles.menuBar__button}
          onClick={() => setOpenMenu((v) => (v === "tools" ? null : "tools"))}
        >
          Инструменты
        </button>

        {openMenu === "tools" && (
          <ul className={styles.dropdown}>
            <li className={styles.dropdown__item}>
              <button
                className={styles.dropdown__button}
                onClick={() => {
                  onToggleToolbar();
                  setOpenMenu(null);
                }}
              >
                {showToolbar ? "✓ Инструменты" : "Инструменты"}
              </button>
            </li>
            <li className={styles.dropdown__item}>
              <button
                className={styles.dropdown__button}
                onClick={() => {
                  onToggleChannelsPanel();
                  setOpenMenu(null);
                }}
              >
                {showChannelsPanel ? "✓ Каналы" : "Каналы"}
              </button>
            </li>
          </ul>
        )}
      </div>

      {isBusy && <div className={styles.menuBar__loading}>Выполняется операция...</div>}
    </div>
  );
}