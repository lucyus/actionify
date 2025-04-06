import { Actionify } from "../../../../core";
import { KeyboardRecorderSettingsBuilder } from "../../../../core/builders";
import { KeyFormatter, KeyMapper } from "../../../../core/services";
import type {
  CaseInsensitiveKey,
  KeyAction,
  KeyState,
} from "../../../../core/types";
import { Inspectable } from "../../../../core/utilities";

/**
 * @description Keyboard events recorder and replayer.
 */
export class KeyboardTracksController {

  public constructor() { }

  /**
   * @description Record the given keyboard actions and save them to a file.
   *
   * @param actions Keyboard actions to record. If unset, all keyboard events will be recorded.
   * @returns The keyboard record file controller.
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
  public record(...actions: Array<`${CaseInsensitiveKey<any>}` | `${CaseInsensitiveKey<any>} ${KeyState}`>) {
    const keyboardActions: KeyAction[] = actions.map((action) => {
      const parts = action.split(" ");
      const input = KeyMapper.toKeyCode(KeyFormatter.format(parts[0]));
      const state = parts[1] as KeyState | undefined;
      return { input, state };
    });
    return new KeyboardRecorderSettingsBuilder(keyboardActions);
  }

  /**
   * @description Replay all input events from a previous `track.record` file.
   *
   * @param filepath The file path of a previous `track.record` file.
   * @returns A promise that resolves when all the input events have been replayed.
   *
   * ---
   * @example
   * // Replay all keyboard events
   * await Actionify.keyboard.track.replay("/path/to/keyboard-record.act");
   *
   * // Replay all keyboard events twice faster
   * await Actionify.keyboard.track.replay("/path/to/keyboard-record.act", { speed: 2 });
   *
   * // Replay all keyboard events twice slower
   * await Actionify.keyboard.track.replay("/path/to/keyboard-record.act", { speed: 0.5 });
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
