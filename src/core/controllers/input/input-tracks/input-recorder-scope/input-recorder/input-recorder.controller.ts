import {
  stopEventListener,
} from "../../../../../../addon";
import { InputRecorderScopeController } from "../../../../../../core/controllers";
import { InputEventService } from "../../../../../../core/services";
import { Inspectable } from "../../../../../../core/utilities";

export class InputRecorderController {

  #inputRecorderScopeController: InputRecorderScopeController;

  public constructor(
    inputRecorderScopeController: InputRecorderScopeController,
  ) {
    this.#inputRecorderScopeController = inputRecorderScopeController;
  }

  /**
   * @description Pause the input recorder.
   *
   * @returns The input record controller.
   *
   * ---
   * @example
   * // Record all keyboard and mouse events
   * const inputRecordController = Actionify.input.track
   *   .record()
   *   .into("/path/to/input-record.act")
   *   .start();
   * // Pause the input recorder
   * inputRecordController.pause();
   *
   * // Record all keyboard "A" key events and mouse left button events
   * const inputRecordController = Actionify.input.track
   *   .record("a", "left")
   *   .into("/path/to/input-record.act")
   *   .start();
   * // Pause the input recorder
   * inputRecordController.pause();
   */
  public pause() {
    this.#inputRecorderScopeController.isPaused = true;
    return this;
  }

  /**
   * @description Resume the paused input recorder.
   *
   * @returns The input record controller.
   *
   * ---
   * @example
   * // Record all keyboard and mouse events
   * const inputRecordController = Actionify.input.track
   *   .record()
   *   .into("/path/to/input-record.act")
   *   .start();
   * // Pause the input recorder
   * inputRecordController.pause();
   * // Resume the input recorder
   * inputRecordController.resume();
   *
   * // Record all keyboard "A" key events and mouse left button events
   * const inputRecordController = Actionify.input.track
   *   .record("a", "left")
   *   .into("/path/to/input-record.act")
   *   .start();
   * // Pause the input recorder
   * inputRecordController.pause();
   * // Resume the input recorder
   * inputRecordController.resume();
   */
  public resume() {
    this.#inputRecorderScopeController.isPaused = false;
    return this;
  }

  /**
   * @description Stop the input recorder.
   *
   * ---
   * @example
   * // Record all keyboard and mouse events
   * const inputRecordController = Actionify.input.track
   *   .record()
   *   .into("/path/to/input-record.act")
   *   .start();
   * // Stop the input recorder
   * inputRecordController.stop();
   *
   * // Record all keyboard "A" key events and mouse left button events
   * const inputRecordController = Actionify.input.track
   *   .record("a", "left")
   *   .into("/path/to/input-record.act")
   *   .start();
   * // Stop the input recorder
   * inputRecordController.stop();
   */
  public stop() {
    this.#inputRecorderScopeController.writeStream.end();
    const inputRecorderIndex = InputEventService.inputRecorders.indexOf(this.#inputRecorderScopeController);
    if (inputRecorderIndex !== -1) {
      InputEventService.inputRecorders.splice(inputRecorderIndex, 1);
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
