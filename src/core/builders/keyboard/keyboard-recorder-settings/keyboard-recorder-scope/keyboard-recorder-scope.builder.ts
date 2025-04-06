import { Actionify } from "../../../../../core";
import { KeyboardRecorderScopeController } from "../../../../../core/controllers";
import type { KeyAction } from "../../../../../core/types";
import { Inspectable } from "../../../../../core/utilities";

export class KeyboardRecorderScopeBuilder {

  #keyboardActions: KeyAction[];
  #filepath: string;

  public constructor(
    keyboardActions: KeyAction[],
    filepath: string
  ) {
    this.#keyboardActions = keyboardActions;
    this.#filepath = filepath;
  }

  /**
   * @description Start recording the given keyboard actions into the given file.
   *
   * @returns The keyboard record controller.
   *
   * ---
   * @example
   * // Record all keyboard events
   * const keyboardRecordController = Actionify.keyboard.track
   *   .record()
   *   .into("/path/to/keyboard-record.act")
   *   .start();
   *
   * // Record all keyboard "A" and "B" key events
   * const keyboardRecordController = Actionify.keyboard.track
   *   .record("a", "b")
   *   .into("/path/to/keyboard-record.act")
   *   .start();
   */
  public start() {
    const keyboardRecorderScopeController = new KeyboardRecorderScopeController(this.#keyboardActions, Actionify.filesystem.writeStream(this.#filepath));
    return keyboardRecorderScopeController.recorderController;
  }

  /**
   * @description Customize the default inspect output (with `console.log`) of a
   * class instance.
   */
  public [Symbol.for('nodejs.util.inspect.custom')](depth: number, inspectOptions: object, inspect: Function) {
    return Inspectable.format(this, depth, inspectOptions, inspect);
  }

}
