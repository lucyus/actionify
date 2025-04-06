import {
  stopEventListener,
} from "../../../../../../addon";
import { KeyboardRecorderScopeController } from "../../../../../../core/controllers";
import { InputEventService } from "../../../../../../core/services";
import { Inspectable } from "../../../../../../core/utilities";

export class KeyboardRecorderController {

  #keyboardRecorderScopeController: KeyboardRecorderScopeController

  public constructor(
    keyboardRecorderScopeController: KeyboardRecorderScopeController,
  ) {
    this.#keyboardRecorderScopeController = keyboardRecorderScopeController;
  }

  /**
   * @description Pause the keyboard recorder.
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
   * // Pause the keyboard recorder
   * keyboardRecordController.pause();
   *
   * // Record all keyboard "A" and "B" key events
   * const keyboardRecordController = Actionify.keyboard.track
   *   .record("a", "b")
   *   .into("/path/to/keyboard-record.act")
   *   .start();
   * // Pause the keyboard recorder
   * keyboardRecordController.pause();
   */
  public pause() {
    this.#keyboardRecorderScopeController.isPaused = true;
    return this;
  }

  /**
   * @description Resume the paused keyboard recorder.
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
   * // Pause the keyboard recorder
   * keyboardRecordController.pause();
   * // Resume the keyboard recorder
   * keyboardRecordController.resume();
   *
   * // Record all keyboard "A" and "B" key events
   * const keyboardRecordController = Actionify.keyboard.track
   *   .record("a", "b")
   *   .into("/path/to/keyboard-record.act")
   *   .start();
   * // Pause the keyboard recorder
   * keyboardRecordController.pause();
   * // Resume the keyboard recorder
   * keyboardRecordController.resume();
   */
  public resume() {
    this.#keyboardRecorderScopeController.isPaused = false;
    return this;
  }

  /**
   * @description Stop the keyboard recorder.
   *
   * ---
   * @example
   * // Record all keyboard events
   * const keyboardRecordController = Actionify.keyboard.track
   *   .record()
   *   .into("/path/to/keyboard-record.act")
   *   .start();
   * // Stop the keyboard recorder
   * keyboardRecordController.stop();
   *
   * // Record all keyboard "A" and "B" key events
   * const keyboardRecordController = Actionify.keyboard.track
   *   .record("a", "b")
   *   .into("/path/to/keyboard-record.act")
   *   .start();
   * // Stop the keyboard recorder
   * keyboardRecordController.stop();
   */
  public stop() {
    this.#keyboardRecorderScopeController.writeStream.end();
    const keyboardRecorderIndex = InputEventService.keyboardRecorders.indexOf(this.#keyboardRecorderScopeController);
    if (keyboardRecorderIndex !== -1) {
      InputEventService.keyboardRecorders.splice(keyboardRecorderIndex, 1);
    }
    if (InputEventService.shouldStopMainListener) {
      stopEventListener();
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
