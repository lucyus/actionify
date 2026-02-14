import { Actionify } from "../../../../../core";
import { MouseRecorderScopeController } from "../../../../../core/controllers";
import type {
  MouseAction,
  MouseRecorderOptions,
} from "../../../../../core/types";
import { Inspectable } from "../../../../../core/utilities";

export class MouseRecorderScopeBuilder {

  #mouseActions: MouseAction[];
  #filepath: string;

  public constructor(
    mouseActions: MouseAction[],
    filepath: string
  ) {
    this.#mouseActions = mouseActions;
    this.#filepath = filepath;
  }

  /**
   * @description Start recording the given mouse actions into the given file.
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
   * // Record all hardware/driver only mouse events
   * const mouseRecordController = Actionify.mouse.track
   *   .record()
   *   .into("/path/to/mouse-record.act")
   *   .start({ ignoreInjected: true });
   *
   * // Record all mouse left and right button events
   * const mouseRecordController = Actionify.mouse.track
   *   .record("left", "right")
   *   .into("/path/to/mouse-record.act")
   *   .start();
   * // Record all hardware/driver only mouse left and right button events
   * const mouseRecordController = Actionify.mouse.track
   *   .record("left", "right")
   *   .into("/path/to/mouse-record.act")
   *   .start({ ignoreInjected: true });
   */
  public start(mouseRecorderOptions?: MouseRecorderOptions) {
    const mouseRecorderScopeController = new MouseRecorderScopeController(
      this.#mouseActions,
      Actionify.filesystem.writeStream(this.#filepath),
      mouseRecorderOptions,
    );
    return mouseRecorderScopeController.recorderController;
  }

  /**
   * @description Customize the default inspect output (with `console.log`) of a
   * class instance.
   */
  public [Symbol.for('nodejs.util.inspect.custom')](depth: number, inspectOptions: object, inspect: Function) {
    return Inspectable.format(this, depth, inspectOptions, inspect);
  }

}
