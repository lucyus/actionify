import { Actionify } from "../../../../core";
import {
  leftClickDown,
  leftClickUp,
} from "../../../../addon";
import { Inspectable } from "../../../../core/utilities";

/**
 * @description Simulate mouse left button press and/or release.
 */
export class MouseLeftController {

  public constructor() { }

  /**
   * @description Simulate mouse left button press.
   *
   * @param options.delay Delay in milliseconds before the mouse left button is pressed.
   *
   * @returns A promise which resolves after the mouse left button is pressed.
   *
   * ---
   * @example
   *
   * // Press [Left Mouse Button] immediately
   * Actionify.mouse.left.down();
   *
   * // Press [Left Mouse Button] in 1 second
   * await Actionify.mouse.left.down({ delay: 1000 });
   */
  public async down(options?: { delay?: number }) {
    const delay = Math.max(0, Math.floor(options?.delay ?? 0));
    return Actionify.time.waitAsync(delay, leftClickDown);
  }

  /**
   * @description Simulate mouse left button release.
   *
   * @param options.delay Delay in milliseconds before the mouse left button is released.
   *
   * @returns A promise which resolves after the mouse left button is released.
   *
   * ---
   * @example
   *
   * // Release [Left Mouse Button] immediately
   * Actionify.mouse.left.up();
   *
   * // Release [Left Mouse Button] in 1 second
   * await Actionify.mouse.left.up({ delay: 1000 });
   */
  public async up(options?: { delay?: number }) {
    const delay = Math.max(0, Math.floor(options?.delay ?? 0));
    return Actionify.time.waitAsync(delay, leftClickUp);
  }

  /**
   * @description Simulate mouse left button click (press then release).
   *
   * @param options.delay Delay in milliseconds before the mouse left button is clicked.
   *
   * @returns A promise which resolves after the mouse left button is clicked.
   *
   * ---
   * @example
   *
   * // Click [Left Mouse Button] immediately
   * Actionify.mouse.left.click();
   *
   * // Click [Left Mouse Button] in 1 second
   * await Actionify.mouse.left.click({ delay: 1000 });
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
