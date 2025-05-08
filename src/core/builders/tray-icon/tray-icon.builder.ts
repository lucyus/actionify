import path from "path";
import { Actionify } from "../../../core";
import {
  createTrayIcon,
} from "../../../addon";
import { LifecycleController, TrayIconController } from "../../../core/controllers";
import type { TrayIconMenuItemOptions } from "../../../core/types";
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
   *
   * // Create a tray icon with a custom menu
   * const trayIconController = Actionify.trayIcon.create({
   *   tooltip: "Your tooltip text",
   *   icon: "success", // All presets: "default", "running", "completed", "paused", "stopped", "info", "success", "warn", "error"
   *   menu: [
   *     {
   *       label: "Your #1 menu item",
   *       onClick() { console.log("You clicked on the first menu item!"); },
   *       position: 0
   *     },
   *     {
   *       label: "Your #2 menu item",
   *       onClick() { console.log("You clicked on the second menu item!"); },
   *       position: 1
   *     },
   *   ]
   * });
   */
  public create(options?: { tooltip?: string, icon?: "default" | "running" | "completed" | "paused" | "stopped" | "info" | "success" | "warn" | "error" | string, menu?: TrayIconMenuItemOptions[] }) {
    // Process the options
    const tooltip = (options?.tooltip ?? "Actionify").substring(0, 127);
    const icon = options?.icon ?? "default";
    const absoluteIconPath = ["default", "running", "completed", "paused", "stopped", "info", "success", "warn", "error"].includes(icon) ? path.resolve(__dirname, `../../../assets/images/icons/${icon}.ico`) : path.resolve(icon);
    if (!Actionify.filesystem.exists(absoluteIconPath)) {
      throw new Error(`File does not exist: ${absoluteIconPath}`);
    }
    const menu = options?.menu ?? [
      { label: "Restart", onClick() { Actionify.restart(); }, position: 0 },
      { label: "Quit", onClick() { Actionify.exit(); }, position: 1 },
    ];
    // Create the tray icon
    LifecycleController.cleanBeforeExit();
    const trayIconWindowId = createTrayIcon(tooltip, absoluteIconPath);
    const trayIconController = new TrayIconController(trayIconWindowId, absoluteIconPath, tooltip);
    for (const menuItem of menu) {
      trayIconController.menu.item.add(menuItem);
    }
    return trayIconController;
  }

  /**
   * @description Customize the default inspect output (with `console.log`) of a
   * class instance.
   */
  public [Symbol.for('nodejs.util.inspect.custom')](depth: number, inspectOptions: object, inspect: Function) {
    return Inspectable.format(this, depth, inspectOptions, inspect);
  }

}
