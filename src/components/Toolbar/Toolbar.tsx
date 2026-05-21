import { MousePointer2, Pipette, SlidersHorizontal } from "lucide-react";
import type { ActiveTool } from "../../types/image";
import styles from "./Toolbar.module.scss";

type ToolbarProps = {
  activeTool: ActiveTool;
  onToolChange: (tool: ActiveTool) => void;
  disabled: boolean;
  onOpenLevels: () => void;
};

export default function Toolbar({
  activeTool,
  onToolChange,
  disabled,
  onOpenLevels,
}: ToolbarProps) {
  const isCursor = activeTool === "none";
  const isEyedropper = activeTool === "eyedropper";

  return (
    <div className={styles.toolbar}>
      <button
        className={`${styles.toolbar__button} ${isCursor ? styles.toolbar__buttonActive : ""}`}
        onClick={() => onToolChange("none")}
        disabled={disabled}
        title="Курсор"
        aria-label="Курсор"
      >
        <MousePointer2 size={18} />
      </button>

      <button
        className={`${styles.toolbar__button} ${isEyedropper ? styles.toolbar__buttonActive : ""}`}
        onClick={() => onToolChange("eyedropper")}
        disabled={disabled}
        title="Пипетка"
        aria-label="Пипетка"
      >
        <Pipette size={18} />
      </button>

      <div className={styles.toolbar__divider} />

      <button
        className={styles.toolbar__button}
        onClick={onOpenLevels}
        disabled={disabled}
        title="Уровни (Levels)"
        aria-label="Уровни (Levels)"
      >
        <SlidersHorizontal size={18} />
      </button>
    </div>
  );
}
