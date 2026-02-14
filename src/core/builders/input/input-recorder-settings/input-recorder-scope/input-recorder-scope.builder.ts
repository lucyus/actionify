import { Actionify } from "../../../../../core";
import { InputRecorderScopeController } from "../../../../../core/controllers";
import type {
  InputAction,
  InputRecorderOptions,
} from "../../../../../core/types";
import { Inspectable } from "../../../../../core/utilities";

export class InputRecorderScopeBuilder {

  #inputActions: InputAction[];
  #filepath: string;

  public constructor(
    inputActions: InputAction[],
    filepath: string
  ) {
    this.#inputActions = inputActions;
    this.#filepath = filepath;
  }

  /**
   * @description Start recording the given input actions into the given file.
   * @param inputRecorderOptions The input recorder options. See {@link InputRecorderOptions}.
   * @returns The input record controller.
   *
   * ---
   * @example
   * // Record all keyboard and mouse events
   * const inputRecordController = Actionify.input.track
   *   .record()
   *   .into("/path/to/input-record.act")
   *   .start();
   * // Record all hardware/driver only keyboard and mouse events
   * const inputRecordController = Actionify.input.track
   *   .record()
   *   .into("/path/to/input-record.act")
   *   .start({ ignoreInjected: true });
   *
   * // Record all keyboard "A" key events and mouse left button events
   * const inputRecordController = Actionify.input.track
   *   .record("a", "left")
   *   .into("/path/to/input-record.act")
   *   .start();
   * // Record all hardware/driver only keyboard "A" key events and mouse left button events
   * const inputRecordController = Actionify.input.track
   *   .record("a", "left")
   *   .into("/path/to/input-record.act")
   *   .start({ ignoreInjected: true });
   */
  public start(inputRecorderOptions?: InputRecorderOptions) {
    const inputRecorderScopeController = new InputRecorderScopeController(
      this.#inputActions,
      Actionify.filesystem.writeStream(this.#filepath),
      inputRecorderOptions,
    );
    return inputRecorderScopeController.recorderController;
  }

  /**
   * @description Customize the default inspect output (with `console.log`) of a
   * class instance.
   */
  public [Symbol.for('nodejs.util.inspect.custom')](depth: number, inspectOptions: object, inspect: Function) {
    return Inspectable.format(this, depth, inspectOptions, inspect);
  }

}
