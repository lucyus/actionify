import { Actionify } from "../../../../core";
import { MouseRecorderSettingsBuilder } from "../../../../core/builders";
import type {
  MouseAction,
  MouseInput,
  MouseState,
} from "../../../../core/types";
import { Inspectable } from "../../../../core/utilities";

/**
 * @description Mouse events recorder and replayer.
 */
export class MouseTracksController {

  public constructor() { }

  /**
   * @description Record the given mouse actions and save them to a file.
   *
   * @param actions Mouse actions to record. If unset, all mouse events will be recorded.
   * @returns The mouse record file controller.
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
  public record(...actions: Array<`${MouseInput}` | `${MouseInput} ${MouseState}`>) {
    const mouseActions: MouseAction[] = actions.map((action) => {
      const parts = action.split(" ");
      const input = parts[0] as MouseInput;
      const state = parts[1] as MouseState | undefined;
      return { input, state };
    });
    return new MouseRecorderSettingsBuilder(mouseActions);
  }

  /**
   * @description Replay all input events from a previous `track.record` file.
   *
   * @param filepath The file path of a previous `track.record` file.
   * @returns A promise that resolves when all the input events have been replayed.
   *
   * ---
   * @example
   * // Replay all mouse events
   * await Actionify.mouse.track.replay("/path/to/mouse-record.act");
   *
   * // Replace all mouse events twice faster
   * await Actionify.mouse.track.replay("/path/to/mouse-record.act", { speed: 2 });
   *
   * // Replace all mouse events twice slower
   * await Actionify.mouse.track.replay("/path/to/mouse-record.act", { speed: 0.5 });
   */
  public async replay(filepath: string, options?: { speed?: number }) {
    await Actionify.input.track.replay(filepath, options);
  }

  /**
   * @description Customize the default inspect output (with `console.log`) of a
   * class instance.
   */
  public [Symbol.for('nodejs.util.inspect.custom')](depth: number, inspectOptions: object, inspect: Function) {
    return Inspectable.format(this, depth, inspectOptions, inspect);
  }

}
