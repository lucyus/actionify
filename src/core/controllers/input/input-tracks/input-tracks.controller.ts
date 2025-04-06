import { Actionify } from "../../../../core";
import { InputRecorderSettingsBuilder } from "../../../../core/builders";
import { KeyFormatter, KeyMapper } from "../../../../core/services";
import type {
  CaseInsensitiveKey,
  Input,
  InputAction,
  KeyState,
  MouseInput,
  MouseState,
} from "../../../../core/types";
import { Inspectable } from "../../../../core/utilities";

/**
 * @description Input events recorder and replayer.
 */
export class InputTracksController {

  public constructor() { }

  /**
   * @description Record the given input actions and save them to a file.
   *
   * @param actions Input actions to record. If unset, all keyboard and mouse events will be recorded.
   * @returns The input record file controller.
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
  public record(...actions: Array<`${MouseInput}` | `${MouseInput} ${MouseState}` | `${CaseInsensitiveKey<any>}` | `${CaseInsensitiveKey<any>} ${KeyState}`>) {
    const inputActions: InputAction[] = actions.map((action) => {
      const parts = action.split(" ");
      const input = parts[0] as Input;
      if (["move", "left", "middle", "right", "wheel"].includes(input)) {
        const mouseType = "mouse";
        const mouseInput = input as MouseInput;
        const mouseState = parts[1] as MouseState | undefined;
        return { type: mouseType, input: mouseInput, state: mouseState };
      }
      const keyboardType = "keyboard";
      const keyboardInput = KeyMapper.toKeyCode(KeyFormatter.format(parts[0]));
      const keyboardState = parts[1] as KeyState | undefined;
      return { type: keyboardType, input: keyboardInput, state: keyboardState };
    });
    return new InputRecorderSettingsBuilder(inputActions);
  }

  /**
   * @description Replay all input events from a previous `track.record` file.
   *
   * @param filepath The file path of a previous `track.record` file.
   * @returns A promise that resolves when all the input events have been replayed.
   *
   * ---
   * @example
   * // Replay all keyboard and mouse events
   * await Actionify.input.track.replay("/path/to/input-record.act");
   *
   * // Replay all keyboard and mouse events twice faster
   * await Actionify.input.track.replay("/path/to/input-record.act", { speed: 2 });
   *
   * // Replay all keyboard and mouse events twice slower
   * await Actionify.input.track.replay("/path/to/input-record.act", { speed: 0.5 });
   */
  public async replay(filepath: string, options?: { speed?: number }) {
    if (!Actionify.filesystem.exists(filepath)) {
      throw new Error(`File does not exist: ${filepath}`);
    }
    const readStream = Actionify.filesystem.readStream(filepath);
    let previousIncompleteLine = "";
    let previousTimestamp = Infinity;
    let accumulatedDelay = 0;
    const speed = Math.max(1e-32, options?.speed ?? 1);
    const promises: Promise<void>[] = [];
    readStream.on("data", (chunk) => {
      const lines = `${previousIncompleteLine}${chunk.toString()}`.split("\n");
      previousIncompleteLine = "";
      for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const line = lines[lineIndex];
        const lineColumns = line.split(",");
        const lineType = parseInt(lineColumns[0]);
        const isLastLine = (lineIndex === (lines.length - 1));
        const isValidLine = [0, 1].includes(lineType) && (lineColumns.length === (lineType === 0 ? 6 : 4));
        if (isValidLine) {
          const type = lineType === 0 ? "mouse" : "keyboard";
          const timestamp = parseInt(lineColumns[1]);
          const delay = previousTimestamp < timestamp ? (Math.round(timestamp / speed) - Math.round(previousTimestamp / speed)) : 0;
          previousTimestamp = timestamp;
          const promise = Actionify.time.waitAsync(delay + accumulatedDelay, () => {
            if (type === "mouse") {
              const rawInput = parseInt(lineColumns[2]);
              switch (rawInput) {
                case 0: {
                  const input: MouseInput = "move";
                  const x = parseInt(lineColumns[4]);
                  const y = parseInt(lineColumns[5]);
                  Actionify.mouse.move(x, y);
                  break;
                }
                case 1: {
                  const input: MouseInput = "left";
                  const state: MouseState = parseInt(lineColumns[3]) === 0 ? "down" : "up";
                  const x = parseInt(lineColumns[4]);
                  const y = parseInt(lineColumns[5]);
                  if (Actionify.mouse.x !== x || Actionify.mouse.y !== y) {
                    Actionify.mouse.move(x, y);
                  }
                  if (state === "down") {
                    Actionify.mouse.left.down();
                  }
                  else {
                    Actionify.mouse.left.up();
                  }
                  break;
                }
                case 2: {
                  const input: MouseInput = "right";
                  const state: MouseState = parseInt(lineColumns[3]) === 0 ? "down" : "up";
                  const x = parseInt(lineColumns[4]);
                  const y = parseInt(lineColumns[5]);
                  if (Actionify.mouse.x !== x || Actionify.mouse.y !== y) {
                    Actionify.mouse.move(x, y);
                  }
                  if (state === "down") {
                    Actionify.mouse.right.down();
                  }
                  else {
                    Actionify.mouse.right.up();
                  }
                  break;
                }
                case 3: {
                  const input: MouseInput = "middle";
                  const state: MouseState = parseInt(lineColumns[3]) === 0 ? "down" : "up";
                  const x = parseInt(lineColumns[4]);
                  const y = parseInt(lineColumns[5]);
                  if (Actionify.mouse.x !== x || Actionify.mouse.y !== y) {
                    Actionify.mouse.move(x, y);
                  }
                  if (state === "down") {
                    Actionify.mouse.middle.down();
                  }
                  else {
                    Actionify.mouse.middle.up();
                  }
                  break;
                }
                case 4: {
                  const input: MouseInput = "wheel";
                  const rawState = parseInt(lineColumns[3]);
                  const state: MouseState = rawState === 0 ? "down" : (rawState === 1 ? "up" : "neutral");
                  const x = parseInt(lineColumns[4]);
                  const y = parseInt(lineColumns[5]);
                  if (Actionify.mouse.x !== x || Actionify.mouse.y !== y) {
                    Actionify.mouse.move(x, y);
                  }
                  switch (state) {
                    case "down":
                      Actionify.mouse.scroll.down();
                      break;
                    case "up":
                      Actionify.mouse.scroll.up();
                      break;
                    default:
                      break;
                  }
                  break;
                }
                default:
                  break;
              }
            }
            else {
              const input = parseInt(lineColumns[2]);
              const state = parseInt(lineColumns[3]) === 0 ? "down" : "up";
              if (state === "down") {
                Actionify.keyboard.down(input);
              }
              else {
                Actionify.keyboard.up(input);
              }
            }
          });
          promises.push(promise);
          accumulatedDelay += delay;
        }
        else if (isLastLine) {
          previousIncompleteLine = line;
        }
      }
    });
    return new Promise<void>((resolve, reject) => {
      readStream.on("end", async () => {
        await Promise.all(promises);
        resolve();
      });
    });
  }

  /**
   * @description Customize the default inspect output (with `console.log`) of a
   * class instance.
   */
  public [Symbol.for('nodejs.util.inspect.custom')](depth: number, inspectOptions: object, inspect: Function) {
    return Inspectable.format(this, depth, inspectOptions, inspect);
  }

}
