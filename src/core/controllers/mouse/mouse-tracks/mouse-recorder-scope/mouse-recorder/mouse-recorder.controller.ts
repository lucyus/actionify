import {
  stopEventListener,
} from "../../../../../../addon";
import { MouseRecorderScopeController } from "../../../../../../core/controllers";
import { InputEventService } from "../../../../../../core/services";
import { Inspectable } from "../../../../../../core/utilities";

export class MouseRecorderController {

  #mouseRecorderScopeController: MouseRecorderScopeController

  public constructor(
    mouseRecorderScopeController: MouseRecorderScopeController,
  ) {
    this.#mouseRecorderScopeController = mouseRecorderScopeController;
  }

  /**
   * @description Pause the mouse recorder.
   *
   * @returns The mouse record controller.
   *
   * ---
   * @example
   * // Record all mouse events
   * const mouseRecordController = Actionify.mouse.track
   *   .record()
   *   .into("/path/to/mouse-record.act")
   *   .start();
   * // Pause the mouse recorder
   * mouseRecordController.pause();
   *
   * // Record all mouse left and right button events
   * const mouseRecordController = Actionify.mouse.track
   *   .record("left", "right")
   *   .into("/path/to/mouse-record.act")
   *   .start();
   * // Pause the mouse recorder
   * mouseRecordController.pause();
   */
  public pause() {
    this.#mouseRecorderScopeController.isPaused = true;
    return this;
  }

  /**
   * @description Resume the paused mouse recorder.
   *
   * @returns The mouse record controller.
   *
   * ---
   * @example
   * // Record all mouse events
   * const mouseRecordController = Actionify.mouse.track
   *   .record()
   *   .into("/path/to/mouse-record.act")
   *   .start();
   * // Pause the mouse recorder
   * mouseRecordController.pause();
   * // Resume the mouse recorder
   * mouseRecordController.resume();
   *
   * // Record all mouse left and right button events
   * const mouseRecordController = Actionify.mouse.track
   *   .record("left", "right")
   *   .into("/path/to/mouse-record.act")
   *   .start();
   * // Pause the mouse recorder
   * mouseRecordController.pause();
   * // Resume the mouse recorder
   * mouseRecordController.resume();
   */
  public resume() {
    this.#mouseRecorderScopeController.isPaused = false;
    return this;
  }

  /**
   * @description Stop the mouse recorder.
   *
   * ---
   * @example
   * // Record all mouse events
   * const mouseRecordController = Actionify.mouse.track
   *   .record()
   *   .into("/path/to/mouse-record.act")
   *   .start();
   * // Stop the mouse recorder
   * mouseRecordController.stop();
   */
  public stop() {
    this.#mouseRecorderScopeController.writeStream.end();
    const mouseRecorderIndex = InputEventService.mouseRecorders.indexOf(this.#mouseRecorderScopeController);
    if (mouseRecorderIndex !== -1) {
      InputEventService.mouseRecorders.splice(mouseRecorderIndex, 1);
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
