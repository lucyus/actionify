import { Actionify } from "../../../../core";
import {
  mouseExtraButtonDown,
  mouseExtraButtonUp,
} from "../../../../addon";
import { Inspectable } from "../../../../core/utilities";

/**
 * @description Simulate mouse extra button press and/or release.
 * @throws Will throw an error if the index is not a strictly positive integer.
 */
export class MouseExtraButtonController {

  #index: 1 | 2;

  public constructor(index: 1 | 2) {
    if (![1, 2].includes(index)) {
      throw new Error(`Invalid extra button index: ${index}. It must be 1 or 2.`);
    }
    this.#index = index;
  }

  /**
   * @description The index of the extra mouse button (starting from 1).
   */
  public get index() {
    return this.#index;
  }

  /**
   * @description Set the index of the extra mouse button.
   * @param index The extra button index (starting from 1).
   * @throws Will throw an error if the index is not a strictly positive integer.
   */
  public set index(index: 1 | 2) {
    if (![1, 2].includes(index)) {
      throw new Error(`Invalid extra button index: ${index}. It must be 1 or 2.`);
    }
    this.#index = index;
  }

  /**
   * @description Simulate mouse extra button press.
   *
   * @param options.delay Delay in milliseconds before the mouse extra button is pressed.
   *
   * @returns A promise which resolves after the mouse extra button is pressed.
   *
   * ---
   * @example
   *
   * // Press [Extra Mouse Button 2] immediately
   * Actionify.mouse.extraButton(2).down();
   *
   * // Press [Extra Mouse Button 2] in 1 second
   * await Actionify.mouse.extraButton(2).down({ delay: 1000 });
   */
  public async down(options?: { delay?: number }) {
    const delay = Math.max(0, Math.floor(options?.delay ?? 0));
    return Actionify.time.waitAsync(delay, () => {
      mouseExtraButtonDown(this.#index);
    });
  }

  /**
   * @description Simulate mouse extra button release.
   *
   * @param options.delay Delay in milliseconds before the mouse extra button is released.
   *
   * @returns A promise which resolves after the mouse extra button is released.
   *
   * ---
   * @example
   *
   * // Release [Extra Mouse Button 2] immediately
   * Actionify.mouse.extraButton(2).up();
   *
   * // Release [Extra Mouse Button 2] in 1 second
   * await Actionify.mouse.extraButton(2).up({ delay: 1000 });
   */
  public async up(options?: { delay?: number }) {
    const delay = Math.max(0, Math.floor(options?.delay ?? 0));
    return Actionify.time.waitAsync(delay, () => {
      mouseExtraButtonUp(this.#index);
    });
  }

  /**
   * @description Simulate mouse extra button click (press then release).
   *
   * @param options.delay Delay in milliseconds before the mouse extra button is clicked.
   *
   * @returns A promise which resolves after the mouse extra button is clicked.
   *
   * ---
   * @example
   *
   * // Click [Extra Mouse Button 2] immediately
   * Actionify.mouse.extraButton(2).click();
   *
   * // Click [Extra Mouse Button 2] in 1 second
   * await Actionify.mouse.extraButton(2).click({ delay: 1000 });
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
