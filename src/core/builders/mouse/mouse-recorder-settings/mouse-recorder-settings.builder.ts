import { MouseRecorderScopeBuilder } from "../../../../core/builders";
import type { MouseAction } from "../../../../core/types";
import { Inspectable } from "../../../../core/utilities";

export class MouseRecorderSettingsBuilder {

  #mouseActions: MouseAction[];

  public constructor(
    mouseActions: MouseAction[],
  ) {
    this.#mouseActions = mouseActions;
  }

  /**
   * @description Create the mouse record file and return its start controller.
   *
   * @param filepath The file path to save the mouse actions to.
   * @returns The mouse record start controller.
   *
   * ---
   * @example
   * // Record all mouse events
   * const mouseRecordController = Actionify.mouse.track
   *   .record()
   *   .into("/path/to/mouse-record.act")
   *   .start();
   *
   * // Record all mouse left and right button events
   * const mouseRecordController = Actionify.mouse.track
   *   .record("left", "right")
   *   .into("/path/to/mouse-record.act")
   *   .start();
   */
  public into(filepath: string) {
    return new MouseRecorderScopeBuilder(this.#mouseActions, filepath);
  }

  /**
   * @description Customize the default inspect output (with `console.log`) of a
   * class instance.
   */
  public [Symbol.for('nodejs.util.inspect.custom')](depth: number, inspectOptions: object, inspect: Function) {
    return Inspectable.format(this, depth, inspectOptions, inspect);
  }

}
