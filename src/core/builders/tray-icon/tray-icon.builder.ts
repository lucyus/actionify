import path from "path";
import { Actionify } from "../../../core";
import {
  createTrayIcon,
} from "../../../addon";
import { LifecycleController, TrayIconController } from "../../../core/controllers";
import { Inspectable } from "../../../core/utilities";

export class TrayIconBuilder {

  public constructor() { }

  /**
   * @description Create a tray icon.
   *
   * @param options The options for creating the tray icon.
   * @returns The tray icon controller.
   *
   * ---
   * @example
   * // Create a default tray icon
   * const trayIconController = Actionify.trayIcon.create();
   *
   * // Create a custom tray icon
   * const trayIconController = Actionify.trayIcon.create({
   *   tooltip: "Your tooltip text",
   *   icon: "/path/to/icon.ico"
   * });
   *
   * // Create a custom tray icon using a preset icon
   * const trayIconController = Actionify.trayIcon.create({
   *   tooltip: "Your tooltip text",
   *   icon: "success" // All presets: "default", "running", "completed", "paused", "stopped", "info", "success", "warn", "error"
   * });
   */
  public create(options?: { tooltip?: string, icon?: "default" | "running" | "completed" | "paused" | "stopped" | "info" | "success" | "warn" | "error" | string }) {
    const tooltip = options?.tooltip ?? "Actionify";
    const icon = options?.icon ?? "default";
    const absoluteIconPath = ["default", "running", "completed", "paused", "stopped", "info", "success", "warn", "error"].includes(icon) ? path.resolve(__dirname, `../../../assets/images/icons/${icon}.ico`) : path.resolve(icon);
    if (!Actionify.filesystem.exists(absoluteIconPath)) {
      throw new Error(`File does not exist: ${absoluteIconPath}`);
    }
    const onTrayMenuRestartClick = (() => { Actionify.restart(); });
    const onTrayMenuExitClick = (() => { Actionify.exit(); });
    LifecycleController.cleanBeforeExit();
    const trayIconWindowId = createTrayIcon(tooltip, absoluteIconPath, onTrayMenuRestartClick, onTrayMenuExitClick);
    return new TrayIconController(trayIconWindowId, absoluteIconPath, tooltip, onTrayMenuRestartClick, onTrayMenuExitClick);
  }

  /**
   * @description Customize the default inspect output (with `console.log`) of a
   * class instance.
   */
  public [Symbol.for('nodejs.util.inspect.custom')](depth: number, inspectOptions: object, inspect: Function) {
    return Inspectable.format(this, depth, inspectOptions, inspect);
  }

}
