import {
  addTrayIconMenuItem,
} from "../../../../../addon";
import { TrayIconMenuItemController } from "../../../../../core/controllers";
import type { TrayIconMenuItemOptions } from "../../../../../core/types";
import { Inspectable } from "../../../../../core/utilities";

export class TrayIconMenuItemsController {

  readonly #windowId: number;
  #items: TrayIconMenuItemController[];

  public constructor(windowId: number) {
    this.#windowId = windowId;
    this.#items = [];
  }

  get #lowestAvailableId() {
    let lowestAvailableId = 1;
    const idSet = new Set(this.#items.map(item => item.id));
    while (idSet.has(lowestAvailableId)) {
      lowestAvailableId++;
    }
    return lowestAvailableId;
  }

  /**
   * @description Add a new menu item to the tray icon menu.
   *
   * @param options The options for the menu item.
   *   @param options.label The label of the menu item. If not specified, a default label will be used.
   *   @param options.onClick The onClick handler of the menu item.
   *   @param options.position The position of the menu item. If not specified, the item will be added at the end of the menu.
   * @returns The tray icon menu item controller.
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
   */
  public add(options?: TrayIconMenuItemOptions): TrayIconMenuItemController {
    const itemId = this.#lowestAvailableId;
    const label = options?.label ?? `Menu Item ${itemId}`;
    const onClick = options?.onClick ?? (() => {  });
    const position = options?.position !== undefined ? Math.max(0, Math.min(this.#items.length, Math.round(options.position))) : this.#items.length;
    const item = new TrayIconMenuItemController(this.#windowId, itemId, position, label, onClick, this);
    this.#items.splice(position, 0, item);
    addTrayIconMenuItem(this.#windowId, itemId, position, label, onClick);
    for (let index = 0; index < this.#items.length; index++) {
      const item = this.#items[index];
      item.position = index;
    }
    return item;
  }

  /**
   * @description Get the list of all tray icon menu items.
   *
   * @returns The list of tray icon menu items.
   *
   * ---
   * @example
   *
   * // Create a tray icon
   * const trayIconController = Actionify.trayIcon.create();
   *
   * // List all tray icon menu items
   * const menuItems = trayIconController.menu.item.list();
   */
  public list() {
    return this.#items;
  }

  /**
   * @description Get a tray icon menu item by its ID, label or a predicate function.
   *
   * @param idOrLabelOrPredicate The ID, label or predicate function to search for the menu item.
   * @returns The tray icon menu item controller or undefined if not found.
   *
   * ---
   * @example
   *
   * // Create a tray icon
   * const trayIconController = Actionify.trayIcon.create();
   *
   * // Get a tray icon menu item by its ID
   * const menuItemById = trayIconController.menu.item.get(1);
   *
   * // Get a tray icon menu item by its label
   * const menuItemByLabel = trayIconController.menu.item.get("Your menu item label");
   *
   * // Get a tray icon menu item by a predicate function
   * const menuItemByPredicate = trayIconController.menu.item.get(item => item.position === 0);
   */
  public get(idOrLabelOrPredicate: number | string | ((item: TrayIconMenuItemController) => boolean)): TrayIconMenuItemController | undefined {
    if (typeof idOrLabelOrPredicate === "number") {
      return this.#items.find(item => item.id === idOrLabelOrPredicate);
    }
    if (typeof idOrLabelOrPredicate === "string") {
      return this.#items.find(item => item.label.toLowerCase().includes(idOrLabelOrPredicate.toLowerCase()));
    }
    return this.#items.find(idOrLabelOrPredicate);
  }

  /**
   * @description Customize the default inspect output (with `console.log`) of a
   * class instance.
   */
  public [Symbol.for('nodejs.util.inspect.custom')](depth: number, inspectOptions: object, inspect: Function) {
    return Inspectable.format(this, depth, inspectOptions, inspect);
  }

}
