import path from "path";
import { Actionify } from "../../../../core";
import {
  updateTrayIcon,
  updateTrayIconTooltip,
} from "../../../../addon";
import { TrayIconController } from "../../../../core/controllers";
import { DataService } from "../../../../core/services";
import type { TrayIconData } from "../../../../core/types";
import { Inspectable } from "../../../../core/utilities";

/**
 * @description Update the tray icon in real time.
 *
 * ---
 * @example
 * // Create a tray icon
 * const trayIconController = Actionify.trayIcon.create();
 * // Update the tray icon with a custom icon
 * trayIconController.update.icon("/path/to/icon.ico");
 * // Update the tray icon tooltip
 * trayIconController.update.tooltip("Your new tooltip text");
 */
export class TrayIconUpdateController {

  readonly #trayIconController: TrayIconController;

  public constructor(
    trayIconController: TrayIconController
  ) {
    this.#trayIconController = trayIconController;
  }

  get #trayIconData(): TrayIconData {
    return DataService.get(this.#trayIconController);
  }

  /**
   * @description Update the tray icon.
   *
   * @param iconOrIconPath The icon path or one of the presets: "default", "running", "completed", "paused", "stopped", "info", "success", "warn", "error"
   * @returns The tray icon controller.
   *
   * ---
   * @example
   * // Create a tray icon
   * const trayIconController = Actionify.trayIcon.create();
   * // Update the tray icon with a custom icon
   * trayIconController.update.icon("/path/to/icon.ico");
   * // Update the tray icon with a preset icon
   * trayIconController.update.icon("success"); // All presets: "default", "running", "completed", "paused", "stopped", "info", "success", "warn", "error"
   */
  public icon(iconOrIconPath: "default" | "running" | "completed" | "paused" | "stopped" | "info" | "success" | "warn" | "error" | string = "default") {
    const newAbsoluteIconPath = ["default", "running", "completed", "paused", "stopped", "info", "success", "warn", "error"].includes(iconOrIconPath) ? path.resolve(__dirname, `../../../../assets/images/icons/${iconOrIconPath}.ico`) : path.resolve(iconOrIconPath);
    if (!Actionify.filesystem.exists(newAbsoluteIconPath)) {
      throw new Error(`File does not exist: ${newAbsoluteIconPath}`);
    }
    this.#trayIconData.absoluteIconPath = newAbsoluteIconPath;
    updateTrayIcon(this.#trayIconData.trayIconWindowId, this.#trayIconData.absoluteIconPath);
    return this.#trayIconController;
  }

  /**
   * @description Update the tray icon tooltip.
   *
   * @param tooltip The tooltip text.
   * @returns The tray icon controller.
   *
   * ---
   * @example
   * // Create a tray icon
   * const trayIconController = Actionify.trayIcon.create();
   * // Update the tray icon tooltip
   * trayIconController.update.tooltip("Your new tooltip text");
   */
  public tooltip(tooltip: string) {
    this.#trayIconData.tooltip = tooltip;
    updateTrayIconTooltip(this.#trayIconData.trayIconWindowId, this.#trayIconData.tooltip);
    return this.#trayIconController;
  }

  /**
   * @description Customize the default inspect output (with `console.log`) of a
   * class instance.
   */
  public [Symbol.for('nodejs.util.inspect.custom')](depth: number, inspectOptions: object, inspect: Function) {
    return Inspectable.format(this, depth, inspectOptions, inspect);
  }

}
