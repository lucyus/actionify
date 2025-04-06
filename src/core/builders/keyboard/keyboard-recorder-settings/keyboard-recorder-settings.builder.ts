import { KeyboardRecorderScopeBuilder } from "../../../../core/builders";
import type { KeyAction } from "../../../../core/types";
import { Inspectable } from "../../../../core/utilities";

export class KeyboardRecorderSettingsBuilder {

  #keyboardActions: KeyAction[];

  public constructor(
    keyboardActions: KeyAction[],
  ) {
    this.#keyboardActions = keyboardActions;
  }

  /**
   * @description Create the keyboard record file and return its start controller.
   *
   * @param filepath The file path to save the keyboard actions to.
   * @returns The keyboard record start controller.
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
  public into(filepath: string) {
    return new KeyboardRecorderScopeBuilder(this.#keyboardActions, filepath);
  }

  /**
   * @description Customize the default inspect output (with `console.log`) of a
   * class instance.
   */
  public [Symbol.for('nodejs.util.inspect.custom')](depth: number, inspectOptions: object, inspect: Function) {
    return Inspectable.format(this, depth, inspectOptions, inspect);
  }

}
