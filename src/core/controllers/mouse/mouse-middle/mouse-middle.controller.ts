import { Actionify } from "../../../../core";
import {
  mouseWheelPressDown,
  mouseWheelPressUp,
} from "../../../../addon";
import { Inspectable } from "../../../../core/utilities";

/**
 * @description Simulate mouse middle button press and/or release.
 */
export class MouseMiddleController {

  public constructor() { }

  /**
   * @description Simulate mouse middle button press.
   *
   * @returns A promise which resolves after the mouse middle button is pressed.
   *
   * ---
   * @example
   *
   * // Press [Middle Mouse Button] immediately
   * Actionify.mouse.middle.down();
   *
   * // Press [Middle Mouse Button] in 1 second
   * await Actionify.mouse.middle.down({ delay: 1000 });
   */
  public async down(options?: { delay?: number }) {
    const delay = Math.max(0, Math.floor(options?.delay ?? 0));
    return Actionify.time.waitAsync(delay, mouseWheelPressDown);
  }

  /**
   * @description Simulate mouse middle button release.
   *
   * @returns A promise which resolves after the mouse middle button is released.
   *
   * ---
   * @example
   *
   * // Release [Middle Mouse Button] immediately
   * Actionify.mouse.middle.up();
   *
   * // Release [Middle Mouse Button] in 1 second
   * await Actionify.mouse.middle.up({ delay: 1000 });
   */
  public async up(options?: { delay?: number }) {
    const delay = Math.max(0, Math.floor(options?.delay ?? 0));
    return Actionify.time.waitAsync(delay, mouseWheelPressUp);
  }

  /**
   * @description Simulate mouse middle button click (press then release).
   *
   * @returns A promise which resolves after the mouse middle button is clicked.
   *
   * ---
   * @example
   *
   * // Click [Middle Mouse Button] immediately
   * Actionify.mouse.middle.click();
   *
   * // Click [Middle Mouse Button] in 1 second
   * await Actionify.mouse.middle.click({ delay: 1000 });
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
