import {
  listWindows,
} from "../../../addon";
import { WindowInteractionController } from "../../../core/controllers";
import type { WindowInfo } from "../../../core/types";
import { Inspectable } from "../../../core/utilities";

/**
 * @description Provide window fetching operations.
 */
export class WindowController {

  public constructor() { }

  /**
   * @description Get information and manage each running application window.
   *
   * @returns The list of running application windows.
   *
   * ---
   * @example
   * // Get the list of running application windows
   * const windows = Actionify.window.list();
   */
  public list(): WindowInteractionController[] {
    const windowsInfo = listWindows();
    const windows = windowsInfo.map<WindowInteractionController>((windowInfo: WindowInfo) => {
      return new WindowInteractionController(windowInfo);
    });
    return windows;
  }

  /**
   * @description Get window information using its window ID, process ID, title, or executable file name.
   *
   * @param search The window ID, process ID, title, or executable file name of the window to search for.
   * @returns The matching window information and interaction functions, or `null` if not found.
   *
   * ---
   * @example
   * // Get window information using its window ID
   * const window = Actionify.window.get(123);
   * // Get window information using its process ID
   * const window = Actionify.window.get(456);
   * // Get window information using its title
   * const window = Actionify.window.get("My App");
   * // Get window information using its executable file name
   * const window = Actionify.window.get("myapp.exe");
   */
  public get(search: number | string): WindowInteractionController | null {
    const windows = this.list();
    return windows.find((window) => (
      window.id === search ||
      window.pid === search ||
      window.title.toLowerCase().includes(search.toString().toLowerCase()) ||
      window.executableFile.includes(search.toString().toLowerCase())
    )) ?? null;
  }

  /**
   * @description Customize the default inspect output (with `console.log`) of a
   * class instance.
   */
  public [Symbol.for('nodejs.util.inspect.custom')](depth: number, inspectOptions: object, inspect: Function) {
    return Inspectable.format(this, depth, inspectOptions, inspect);
  }

}
