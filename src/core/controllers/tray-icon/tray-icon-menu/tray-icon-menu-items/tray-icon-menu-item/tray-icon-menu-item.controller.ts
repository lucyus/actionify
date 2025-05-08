import {
  updateTrayIconMenuItemLabel,
  updateTrayIconMenuItemCallback,
  removeTrayIconMenuItem,
} from "../../../../../../addon";
import { TrayIconMenuItemsController } from "../../../../../../core/controllers";
import { Inspectable } from "../../../../../../core/utilities";

export class TrayIconMenuItemController {

  readonly #windowId: number;
  #itemId: number;
  #position: number;
  #label: string;
  #onClick: () => void;
  #trayIconMenuItemsController: TrayIconMenuItemsController;

  public constructor(
    windowId: number,
    itemId: number,
    position: number,
    label: string,
    onClick: () => void = () => {},
    trayIconMenuItemsController: TrayIconMenuItemsController,
  ) {
    this.#windowId = windowId;
    this.#itemId = itemId;
    this.#position = position;
    this.#label = label;
    this.#onClick = onClick;
    this.#trayIconMenuItemsController = trayIconMenuItemsController;
  }

  get #items() {
    return this.#trayIconMenuItemsController.list();
  }

  /**
   * @description Get the tray icon menu item ID.
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
   * // Get the tray icon menu item ID
   * const itemId = menuItem.id;
   */
  public get id() {
    return this.#itemId;
  }

  /**
   * @description Get the tray icon menu item position.
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
   * // Get the tray icon menu item position
   * const position = menuItem.position;
   */
  public get position() {
    return this.#position;
  }

  /**
   * @description Update the tray icon menu item position.
   *
   * @param position The new position of the tray icon menu item.
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
   * // Update the tray icon menu item position
   * menuItem.position = 1;
   */
  public set position(position: number) {
    const oldPosition = this.position;
    const newPosition = Math.max(0, Math.min(this.#items.length, Math.round(position)));
    if (oldPosition !== newPosition) {
      this.remove();
      const newItem = this.#trayIconMenuItemsController.add({
        label: this.#label,
        onClick: this.#onClick,
        position: newPosition,
      });
      this.#itemId = newItem.id;
      this.#position = newItem.position;
      this.#items[newItem.position] = this;
    }
  }

  /**
   * @description Get the tray icon menu item label.
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
   * // Get the tray icon menu item label
   * const label = menuItem.label;
   */
  public get label() {
    return this.#label;
  }

  /**
   * @description Update the tray icon menu item label.
   *
   * @param label The new label of the tray icon menu item.
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
   */
  public set label(label: string) {
    this.#label = label;
    updateTrayIconMenuItemLabel(this.#windowId, this.id, label);
  }

  /**
   * @description Get the tray icon menu item onClick handler.
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
   * // Get the tray icon menu item onClick handler
   * const onClick = menuItem.onClick;
   */
  public get onClick() {
    return this.#onClick;
  }


  /**
   * @description Update the tray icon menu item onClick handler.
   *
   * @param onClick The new onClick handler of the tray icon menu item.
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
   * // Update the tray icon menu item onClick handler
   * menuItem.onClick = () => { console.log("You clicked on the new menu item!"); };
   */
  public set onClick(onClick: () => void) {
    this.#onClick = onClick;
    updateTrayIconMenuItemCallback(this.#windowId, this.id, this.onClick);
  }


  /**
   * @description Remove the tray icon menu item.
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
   * // Remove the tray icon menu item
   * menuItem.remove();
   */
  public remove() {
    const index = this.#items.indexOf(this);
    if (index !== -1) {
      const isLastItem = index === this.#items.length - 1;
      this.#items.splice(index, 1);
      removeTrayIconMenuItem(this.#windowId, this.id);
      if (!isLastItem) {
        for (let index = 0; index < this.#items.length; index++) {
          const item = this.#items[index];
          item.#position = index;
        }
      }
    }
  }

  /**
   * @description Customize the default inspect output (with `console.log`) of a
   * class instance.
   */
  public [Symbol.for('nodejs.util.inspect.custom')](depth: number, inspectOptions: object, inspect: Function) {
    return Inspectable.format(this, depth, inspectOptions, inspect);
  }

}
