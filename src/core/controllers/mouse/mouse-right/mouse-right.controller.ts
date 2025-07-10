import { Actionify } from "../../../../core";
import {
  rightClickDown,
  rightClickUp,
} from "../../../../addon";
import { Inspectable } from "../../../../core/utilities";

/**
 * @description Simulate mouse right button press and/or release.
 */
export class MouseRightController {

  public constructor() { }

  /**
   * @description Simulate mouse right button press.
   *
   * @param options.delay Delay in milliseconds before the mouse right button is pressed.
   *
   * @returns A promise which resolves after the mouse right button is pressed.
   *
   * ---
   * @example
   *
   * // Press [Right Mouse Button] immediately
   * Actionify.mouse.right.down();
   *
   * // Press [Right Mouse Button] in 1 second
   * await Actionify.mouse.right.down({ delay: 1000 });
   */
  public async down(options?: { delay?: number }) {
    const delay = Math.max(0, Math.floor(options?.delay ?? 0));
    return Actionify.time.waitAsync(delay, rightClickDown);
  }

  /**
   * @description Simulate mouse right button release.
   *
   * @param options.delay Delay in milliseconds before the mouse right button is released.
   *
   * @returns A promise which resolves after the mouse right button is released.
   *
   * ---
   * @example
   *
   * // Release [Right Mouse Button] immediately
   * Actionify.mouse.right.up();
   *
   * // Release [Right Mouse Button] in 1 second
   * await Actionify.mouse.right.up({ delay: 1000 });
   */
  public async up(options?: { delay?: number }) {
    const delay = Math.max(0, Math.floor(options?.delay ?? 0));
    return Actionify.time.waitAsync(delay, rightClickUp);
  }

  /**
   * @description Simulate mouse right button click (press then release).
   *
   * @param options.delay Delay in milliseconds before the mouse right button is clicked.
   *
   * @returns A promise which resolves after the mouse right button is clicked.
   *
   * ---
   * @example
   *
   * // Click [Right Mouse Button] immediately
   * Actionify.mouse.right.click();
   *
   * // Click [Right Mouse Button] in 1 second
   * await Actionify.mouse.right.click({ delay: 1000 });
   */
  public async click(options?: { delay?: number }) {
    const delay = Math.max(0, Math.floor(options?.delay ?? 0)) / 2;
    await this.down({ delay });
    await this.up({ delay });
  }

  /**
   * @description Customize the default inspect output (with `console.log`) of a
   * class instance.
   */
  public [Symbol.for('nodejs.util.inspect.custom')](depth: number, inspectOptions: object, inspect: Function) {
    return Inspectable.format(this, depth, inspectOptions, inspect);
  }

}
