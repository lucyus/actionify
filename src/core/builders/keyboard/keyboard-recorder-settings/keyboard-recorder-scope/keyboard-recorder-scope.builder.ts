import { Actionify } from "../../../../../core";
import { KeyboardRecorderScopeController } from "../../../../../core/controllers";
import type {
  KeyAction,
  KeyboardRecorderFileOptions,
  KeyboardRecorderOptions,
} from "../../../../../core/types";
import { Inspectable } from "../../../../../core/utilities";

export class KeyboardRecorderScopeBuilder {

  #keyboardActions: KeyAction[];
  #filepath: string;
  #keyboardRecorderFileOptions: Required<KeyboardRecorderFileOptions>;

  public constructor(
    keyboardActions: KeyAction[],
    filepath: string,
    keyboardRecorderFileOptions: Required<KeyboardRecorderFileOptions>,
  ) {
    this.#keyboardActions = keyboardActions;
    this.#filepath = filepath;
    this.#keyboardRecorderFileOptions = keyboardRecorderFileOptions;
  }

  /**
   * @description Start recording the given keyboard actions into the given file.
   * @param keyboardRecorderOptions The keyboard recorder options. See {@link KeyboardRecorderOptions}.
   * @returns The keyboard record controller.
   *
   * ---
   * @example
   * // Record all keyboard events
   * const keyboardRecordController = Actionify.keyboard.track
   *   .record()
   *   .into("/path/to/keyboard-record.act")
   *   .start();
   * // Record all hardware/driver only keyboard events
   * const keyboardRecordController = Actionify.keyboard.track
   *   .record()
   *   .into("/path/to/keyboard-record.act")
   *   .start({ ignoreInjected: true });
   *
   * // Record all keyboard "A" and "B" key events
   * const keyboardRecordController = Actionify.keyboard.track
   *   .record("a", "b")
   *   .into("/path/to/keyboard-record.act")
   *   .start();
   * // Record all hardware/driver only keyboard "A" and "B" key events
   * const keyboardRecordController = Actionify.keyboard.track
   *   .record("a", "b")
   *   .into("/path/to/keyboard-record.act")
   *   .start({ ignoreInjected: true });
   */
  public start(keyboardRecorderOptions?: KeyboardRecorderOptions) {
    const keyboardRecorderScopeController = new KeyboardRecorderScopeController(
      this.#keyboardActions,
      Actionify.filesystem.writeStream(this.#filepath, this.#keyboardRecorderFileOptions),
      keyboardRecorderOptions,
    );
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
