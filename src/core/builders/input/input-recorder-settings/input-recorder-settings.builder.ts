import { InputRecorderScopeBuilder } from "../../../../core/builders";
import type { InputAction } from "../../../../core/types";
import { Inspectable } from "../../../../core/utilities";

export class InputRecorderSettingsBuilder {

  #inputActions: InputAction[];

  public constructor(
    inputActions: InputAction[],
  ) {
    this.#inputActions = inputActions;
  }

  /**
   * @description Create the input record file and return its start controller.
   *
   * @param filepath The file path to save the input actions to.
   * @returns The input record start controller.
   *
   * ---
   * @example
   * // Record all keyboard and mouse events
   * const inputRecordController = Actionify.input.track
   *   .record()
   *   .into("/path/to/input-record.act")
   *   .start();
   *
   * // Record all keyboard "A" key events and mouse left button events
   * const inputRecordController = Actionify.input.track
   *   .record("a", "left")
   *   .into("/path/to/input-record.act")
   *   .start();
   */
  public into(filepath: string) {
    return new InputRecorderScopeBuilder(this.#inputActions, filepath);
  }

  /**
   * @description Customize the default inspect output (with `console.log`) of a
   * class instance.
   */
  public [Symbol.for('nodejs.util.inspect.custom')](depth: number, inspectOptions: object, inspect: Function) {
    return Inspectable.format(this, depth, inspectOptions, inspect);
  }

}
