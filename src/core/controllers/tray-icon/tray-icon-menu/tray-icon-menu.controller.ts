import { TrayIconMenuItemsController } from "../../../../core/controllers";
import { Inspectable } from "../../../../core/utilities";

export class TrayIconMenuController {

  readonly #windowId: number;
  readonly #trayIconMenuItemsController: TrayIconMenuItemsController;

  public constructor(windowId: number) {
    this.#windowId = windowId;
    this.#trayIconMenuItemsController = new TrayIconMenuItemsController(this.#windowId);
  }

  /**
   * @description Get the tray icon menu items controller.
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
   * // Update the tray icon menu item label
   * menuItem.label = "Your new menu item label";
   *
   * // Update the tray icon menu item position
   * menuItem.position = 1;
   *
   * // Update the tray icon menu item onClick handler
   * menuItem.onClick = () => { console.log("You clicked on the new menu item!"); };
   *
   * // Remove the tray icon menu item
   * menuItem.remove();
   */
  public get item(): TrayIconMenuItemsController {
    return this.#trayIconMenuItemsController;
  }

  /**
   * @description Customize the default inspect output (with `console.log`) of a
   * class instance.
   */
  public [Symbol.for('nodejs.util.inspect.custom')](depth: number, inspectOptions: object, inspect: Function) {
    return Inspectable.format(this, depth, inspectOptions, inspect);
  }

}
