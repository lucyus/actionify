import { Actionify } from "../../../core";
import {
  InputEventsController,
  InputTracksController,
} from "../../../core/controllers";
import type { CaseInsensitiveKey, MouseInput } from "../../../core/types";
import { Inspectable } from "../../../core/utilities";

/**
 * @description Global input operations.
 */
export class InputController {

  #inputEventsController: InputEventsController;
  #inputTracksController: InputTracksController;

  public constructor() {
    this.#inputEventsController = new InputEventsController();
    this.#inputTracksController = new InputTracksController();
  }

  /**
   * @description Input events listening manager.
   */
  public get events(): InputEventsController {
    return this.#inputEventsController;
  }

  /**
   * @description Input events recorder and replayer.
   */
  public get track(): InputTracksController {
    return this.#inputTracksController;
  }

  /**
   * @description Press a single keyboard key or mouse button.
   *
   * @param keyOrMouseInput The keyboard key or the mouse button to press.
   * `wheel` scrolls the mouse wheel down by one scroll.
   * @param options.delay Delay in milliseconds before the input is pressed.
   * @returns A promise which resolves after the input is pressed.
   * @throws Will throw an error if the mouse input cannot be pressed (mouse `move`).
   *
   * ---
   * @example
   * // Press the "A" key immediately
   * Actionify.input.down("a");
   *
   * // Press the "A" key immediately using its Windows virtual key code
   * Actionify.input.down(0x41);
   *
   * // Press the "A" key immediately using its Linux key symbol
   * Actionify.input.down(0x61);
   *
   * // Press the mouse left button in 1 second
   * await Actionify.input.down("left", { delay: 1000 });
   */
  public async down<T extends string>(
    keyOrMouseInput: Exclude<MouseInput, "move"> | CaseInsensitiveKey<T> | number,
    options?: { delay?: number }
  ): Promise<void> {
    switch (keyOrMouseInput) {
      case "left":
        return Actionify.mouse.left.down(options);
      case "middle":
        return Actionify.mouse.middle.down(options);
      case "right":
        return Actionify.mouse.right.down(options);
      case "extraButton1":
        return Actionify.mouse.extraButton(1).down(options);
      case "extraButton2":
        return Actionify.mouse.extraButton(2).down(options);
      case "wheel":
        await Actionify.mouse.scroll.down(undefined, options);
        return;
      case "move":
        throw new Error(`Cannot press mouse input: "${keyOrMouseInput}".`);
      default:
        return Actionify.keyboard.down(keyOrMouseInput, options);
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
