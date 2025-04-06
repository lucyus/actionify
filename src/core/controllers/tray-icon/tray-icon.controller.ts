import {
  removeTrayIcon,
} from "../../../addon";
import { TrayIconUpdateController } from "../../../core/controllers";
import { DataService } from "../../../core/services";
import type { TrayIconData } from "../../../core/types";
import { Inspectable } from "../../../core/utilities";

export class TrayIconController {

  readonly #trayIconUpdateController: TrayIconUpdateController;

  public constructor(
    trayIconWindowId: number,
    absoluteIconPath: string,
    tooltip: string,
    onTrayMenuRestartClick: () => void,
    onTrayMenuExitClick: () => void
  ) {
    DataService.set(this, {
      trayIconWindowId,
      absoluteIconPath,
      tooltip,
      onTrayMenuRestartClick,
      onTrayMenuExitClick,
    });
    this.#trayIconUpdateController = new TrayIconUpdateController(this);
  }

  get #trayIconData(): TrayIconData {
    return DataService.get(this);
  }

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
  public get update(): TrayIconUpdateController {
    return this.#trayIconUpdateController;
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
    removeTrayIcon(this.#trayIconData.trayIconWindowId);
  }

  /**
   * @description Customize the default inspect output (with `console.log`) of a
   * class instance.
   */
  public [Symbol.for('nodejs.util.inspect.custom')](depth: number, inspectOptions: object, inspect: Function) {
    return Inspectable.format(this, depth, inspectOptions, inspect);
  }

}
