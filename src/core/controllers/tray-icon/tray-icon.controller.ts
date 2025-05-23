import path from "path";
import {
  removeTrayIcon,
  updateTrayIcon,
  updateTrayIconTooltip,
} from "../../../addon";
import { Actionify } from "../../../core";
import { TrayIconMenuController } from "../../../core/controllers";
import { Inspectable } from "../../../core/utilities";

export class TrayIconController {

  readonly #windowId: number;
  #absoluteIconPath: string;
  #tooltip: string;
  #trayIconMenuController: TrayIconMenuController;

  public constructor(
    trayIconWindowId: number,
    absoluteIconPath: string,
    tooltip: string,
  ) {
    this.#windowId = trayIconWindowId;
    this.#absoluteIconPath = absoluteIconPath;
    this.#tooltip = tooltip;
    this.#trayIconMenuController = new TrayIconMenuController(this.#windowId);
  }

  /**
   * @description Get the tray icon absolute image path.
   *
   * ---
   * @example
   * // Create a tray icon
   * const trayIconController = Actionify.trayIcon.create();
   * // Get the tray icon absolute image path
   * const iconPath = trayIconController.icon;
   */
  public get icon(): string {
    return this.#absoluteIconPath;
  }

  /**
   * @description Update the tray icon.
   *
   * @param iconOrIconPath The icon path or one of the presets: "default", "running", "completed", "paused", "stopped", "info", "success", "warn", "error"
   *
   * ---
   * @example
   * // Create a tray icon
   * const trayIconController = Actionify.trayIcon.create();
   * // Update the tray icon with a custom icon
   * trayIconController.icon = "/path/to/icon.ico";
   * // Update the tray icon with a preset icon
   * trayIconController.icon = "success"; // All presets: "default", "running", "completed", "paused", "stopped", "info", "success", "warn", "error"
   */
  public set icon(iconOrIconPath: "default" | "running" | "completed" | "paused" | "stopped" | "info" | "success" | "warn" | "error" | string) {
    const newAbsoluteIconPath = ["default", "running", "completed", "paused", "stopped", "info", "success", "warn", "error"].includes(iconOrIconPath) ? path.resolve(__dirname, `../../../assets/images/icons/${iconOrIconPath}.ico`) : path.resolve(iconOrIconPath);
    if (!Actionify.filesystem.exists(newAbsoluteIconPath)) {
      throw new Error(`File does not exist: ${newAbsoluteIconPath}`);
    }
    this.#absoluteIconPath = newAbsoluteIconPath;
    updateTrayIcon(this.#windowId, this.#absoluteIconPath);
  }

  /**
   * @description Get the tray icon tooltip.
   *
   * ---
   * @example
   * // Create a tray icon
   * const trayIconController = Actionify.trayIcon.create();
   * // Get the tray icon tooltip
   * const tooltip = trayIconController.tooltip;
   */
  public get tooltip(): string {
    return this.#tooltip;
  }

  /**
   * @description Update the tray icon tooltip.
   *
   * @param tooltip The tooltip text.
   *
   * ---
   * @example
   * // Create a tray icon
   * const trayIconController = Actionify.trayIcon.create();
   * // Update the tray icon tooltip
   * trayIconController.tooltip = "Your new tooltip text";
   */
  public set tooltip(tooltip: string) {
    this.#tooltip = tooltip.substring(0, 127);
    updateTrayIconTooltip(this.#windowId, this.#tooltip);
  }

  /**
   * @description Get the tray icon menu controller.
   *
   * ---
   * @example
   *
   * // Create a tray icon
   * const trayIconController = Actionify.trayIcon.create();
   *
   * // Create a tray icon menu item
   * const menuItem = trayIconController.menu.item.add({
   *   label: "Your menu item",
   *   onClick() { console.log("You clicked on the menu item!"); },
   *   position: 0
   * });
   *
   * // List all tray icon menu items
   * const menuItems = trayIconController.menu.item.list();
   */
  public get menu(): TrayIconMenuController {
    return this.#trayIconMenuController;
  }

  /**
   * @description Remove the tray icon.
   *
   * ---
   * @example
   * // Create a tray icon
   * const trayIconController = Actionify.trayIcon.create();
   * // Remove the tray icon
   * trayIconController.remove();
   */
  public remove(): void {
    removeTrayIcon(this.#windowId);
  }

  /**
   * @description Customize the default inspect output (with `console.log`) of a
   * class instance.
   */
  public [Symbol.for('nodejs.util.inspect.custom')](depth: number, inspectOptions: object, inspect: Function) {
    return Inspectable.format(this, depth, inspectOptions, inspect);
  }

}
