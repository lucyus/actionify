import { Actionify } from "../../../../core";
import {
  mouseWheelScrollDown,
  mouseWheelScrollUp,
} from "../../../../addon";
import { OperatingSystemService } from "../../../../core/services";
import { Inspectable } from "../../../../core/utilities";

/**
 * @description Simulate mouse wheel scroll down or up.
 */
export class MouseScrollController {

  public constructor() { }

  /**
   * @description Simulate mouse wheel scroll down.
   *
   * @param scrollCount Amount of down scrolls (float). If unset, defaults to `1.0` (1 scroll).
   * @param options.delay Delay in milliseconds before the mouse wheel is scrolled down.
   * @returns A promise which resolves after the mouse wheel is scrolled down.
   *
   * ---
   * @example
   *
   * // Scroll down once immediately
   * Actionify.mouse.scroll.down();
   *
   * // Scroll down twice immediately
   * Actionify.mouse.scroll.down(2.0);
   *
   * // Scroll down once after 1 second
   * await Actionify.mouse.scroll.down(undefined, { delay: 1000 });
   *
   * // Scroll down twice after 1 second
   * await Actionify.mouse.scroll.down(2.0, { delay: 1000 });
   *
   * // Scroll down linearly over 1 second the length of one scroll
   * await Actionify.mouse.scroll.down(undefined, { motion: "linear", delay: 1000, steps: "auto" });
   *
   * // Scroll down linearly over 1 second the length of two scrolls
   * await Actionify.mouse.scroll.down(2.0, { motion: "linear", delay: 1000, steps: "auto" });
   */
  public async down(numberOfScrolls: number = 1.0, options?: { steps?: number | "auto", delay?: number, motion?: "linear" }) {
    const steps = options?.steps === "auto" ? Infinity : Math.max(0, Math.round(options?.steps ?? 0));
    const delay = Math.max(0, Math.floor(options?.delay ?? 0));
    const motion = options?.motion ?? "linear";
    switch (OperatingSystemService.platform) {
      case "win32": {
        const windowsDefaultScrollDpi = 120;
        const finalScrollAmount = Math.round(numberOfScrolls * windowsDefaultScrollDpi);
        if (steps === 0 || delay === 0) {
          return Actionify.time.waitAsync(delay, () => mouseWheelScrollDown(finalScrollAmount));
        }
        //Calculate the line from start to end (the shortest diagonal)
        const initialScrollAmount = 0;
        const deltaScroll = finalScrollAmount - initialScrollAmount;
        // Chebyshev distance
        const intermediateScrolls = Math.max(0, Math.abs(deltaScroll) - 1);
        const possibleSteps = Math.min(Math.floor(delay / 16.6), steps, intermediateScrolls);
        const preciseDelayPerScroll = delay / (possibleSteps + 1);
        const delayPerScroll = Math.floor(preciseDelayPerScroll);
        let accumulatedDelay = 0;
        let accumulatedScroll = 0;
        const promises: Promise<void>[] = [];
        if (possibleSteps > 0) {
          const correctionDelayOccurrence = preciseDelayPerScroll !== delayPerScroll ? Math.ceil(1 / (preciseDelayPerScroll - delayPerScroll)) : Infinity;
          const directionScroll = Math.sign(deltaScroll);
          const stepScroll = deltaScroll / (possibleSteps + 1);
          switch (motion) {
            case "linear": {
              const intermediateScrollAmount = directionScroll !== 0 ? Math.round(stepScroll) : 0;
              for (let offset = 1; offset < possibleSteps + 1; offset++) {
                const correctedDelayPerPosition = delayPerScroll + (offset % correctionDelayOccurrence === 0 ? 1 : 0);
                promises.push(Actionify.time.waitAsync(correctedDelayPerPosition + accumulatedDelay, () => mouseWheelScrollDown(intermediateScrollAmount)));
                accumulatedDelay += correctedDelayPerPosition;
                accumulatedScroll += intermediateScrollAmount;
              }
              break;
            }
            default:
              break;
          }
        }
        promises.push(Actionify.time.waitAsync(delay, () => mouseWheelScrollDown(finalScrollAmount - accumulatedScroll)));
        return Promise.all(promises);
      }
      case "linux": {
        const finalScrollCount = Math.round(numberOfScrolls);
        if (steps === 0 || delay === 0) {
          return Actionify.time.waitAsync(delay, () => mouseWheelScrollDown(finalScrollCount));
        }
        //Calculate the line from start to end (the shortest diagonal)
        const initialScrollCount = 0;
        const deltaScroll = finalScrollCount - initialScrollCount;
        // Chebyshev distance
        const intermediateScrolls = Math.max(0, Math.abs(deltaScroll) - 1);
        const possibleSteps = Math.min(Math.floor(delay / 16.6), steps, intermediateScrolls);
        const preciseDelayPerScroll = delay / (possibleSteps + 1);
        const delayPerScroll = Math.floor(preciseDelayPerScroll);
        let accumulatedDelay = 0;
        let accumulatedScroll = 0;
        const promises: Promise<void>[] = [];
        if (possibleSteps > 0) {
          const correctionDelayOccurrence = preciseDelayPerScroll !== delayPerScroll ? Math.ceil(1 / (preciseDelayPerScroll - delayPerScroll)) : Infinity;
          const directionScroll = Math.sign(deltaScroll);
          const stepScroll = deltaScroll / (possibleSteps + 1);
          switch (motion) {
            case "linear": {
              const intermediateScrollCount = directionScroll !== 0 ? Math.floor(stepScroll) : 0;
              for (let offset = 1; offset < possibleSteps + 1; offset++) {
                const correctedDelayPerPosition = delayPerScroll + (offset % correctionDelayOccurrence === 0 ? 1 : 0);
                promises.push(Actionify.time.waitAsync(correctedDelayPerPosition + accumulatedDelay, () => mouseWheelScrollDown(intermediateScrollCount)));
                accumulatedDelay += correctedDelayPerPosition;
                accumulatedScroll += intermediateScrollCount;
              }
              break;
            }
            default:
              break;
          }
        }
        promises.push(Actionify.time.waitAsync(delay, () => mouseWheelScrollDown(finalScrollCount - accumulatedScroll)));
        return Promise.all(promises);
      }
      default:
        throw new Error(`Unsupported platform: ${OperatingSystemService.platform}`);
    }
  }

  /**
   * @description Simulate mouse wheel scroll up.
   *
   * @param scrollAmount Amount of wheel deltas to scroll up. If unset, the default mouse wheel scroll amount will be used.
   * @param options.delay Delay in milliseconds before the mouse wheel is scrolled up.
   * @returns A promise which resolves after the mouse wheel is scrolled up.
   *
   * ---
   * @example
   *
   * // Scroll up once immediately
   * Actionify.mouse.scroll.up();
   *
   * // Scroll up twice immediately
   * Actionify.mouse.scroll.up(2.0);
   *
   * // Scroll up once after 1 second
   * await Actionify.mouse.scroll.up(undefined, { delay: 1000 });
   *
   * // Scroll up twice after 1 second
   * await Actionify.mouse.scroll.up(2.0, { delay: 1000 });
   *
   * // Scroll up linearly over 1 second the length of one scroll
   * await Actionify.mouse.scroll.up(undefined, { motion: "linear", delay: 1000, steps: "auto" });
   *
   * // Scroll up linearly over 1 second the length of two scrolls
   * await Actionify.mouse.scroll.up(2.0, { motion: "linear", delay: 1000, steps: "auto" });
   */
  public async up(numberOfScrolls: number = 1.0, options?: { steps?: number | "auto", delay?: number, motion?: "linear" }) {
    const steps = options?.steps === "auto" ? Infinity : Math.max(0, Math.round(options?.steps ?? 0));
    const delay = Math.max(0, Math.floor(options?.delay ?? 0));
    const motion = options?.motion ?? "linear";
    switch (OperatingSystemService.platform) {
      case "win32": {
        const windowsDefaultScrollDpi = 120;
        const finalScrollAmount = Math.round(numberOfScrolls * windowsDefaultScrollDpi);
        if (steps === 0 || delay === 0) {
          return Actionify.time.waitAsync(delay, () => mouseWheelScrollUp(finalScrollAmount));
        }
        //Calculate the line from start to end (the shortest diagonal)
        const initialScrollAmount = 0;
        const deltaScroll = finalScrollAmount - initialScrollAmount;
        // Chebyshev distance
        const intermediateScrolls = Math.max(0, Math.abs(deltaScroll) - 1);
        const possibleSteps = Math.min(Math.floor(delay / 16.6), steps, intermediateScrolls);
        const preciseDelayPerScroll = delay / (possibleSteps + 1);
        const delayPerScroll = Math.floor(preciseDelayPerScroll);
        let accumulatedDelay = 0;
        let accumulatedScroll = 0;
        const promises: Promise<void>[] = [];
        if (possibleSteps > 0) {
          const correctionDelayOccurrence = preciseDelayPerScroll !== delayPerScroll ? Math.ceil(1 / (preciseDelayPerScroll - delayPerScroll)) : Infinity;
          const directionScroll = Math.sign(deltaScroll);
          const stepScroll = deltaScroll / (possibleSteps + 1);
          switch (motion) {
            case "linear": {
              const intermediateScrollAmount = directionScroll !== 0 ? Math.round(stepScroll) : 0;
              for (let offset = 1; offset < possibleSteps + 1; offset++) {
                const correctedDelayPerPosition = delayPerScroll + (offset % correctionDelayOccurrence === 0 ? 1 : 0);
                promises.push(Actionify.time.waitAsync(correctedDelayPerPosition + accumulatedDelay, () => mouseWheelScrollUp(intermediateScrollAmount)));
                accumulatedDelay += correctedDelayPerPosition;
                accumulatedScroll += intermediateScrollAmount;
              }
              break;
            }
            default:
              break;
          }
        }
        promises.push(Actionify.time.waitAsync(delay, () => mouseWheelScrollUp(finalScrollAmount - accumulatedScroll)));
        return Promise.all(promises);
      }
      case "linux": {
        const finalScrollCount = Math.round(numberOfScrolls);
        if (steps === 0 || delay === 0) {
          return Actionify.time.waitAsync(delay, () => mouseWheelScrollUp(finalScrollCount));
        }
        //Calculate the line from start to end (the shortest diagonal)
        const initialScrollCount = 0;
        const deltaScroll = finalScrollCount - initialScrollCount;
        // Chebyshev distance
        const intermediateScrolls = Math.max(0, Math.abs(deltaScroll) - 1);
        const possibleSteps = Math.min(Math.floor(delay / 16.6), steps, intermediateScrolls);
        const preciseDelayPerScroll = delay / (possibleSteps + 1);
        const delayPerScroll = Math.floor(preciseDelayPerScroll);
        let accumulatedDelay = 0;
        let accumulatedScroll = 0;
        const promises: Promise<void>[] = [];
        if (possibleSteps > 0) {
          const correctionDelayOccurrence = preciseDelayPerScroll !== delayPerScroll ? Math.ceil(1 / (preciseDelayPerScroll - delayPerScroll)) : Infinity;
          const directionScroll = Math.sign(deltaScroll);
          const stepScroll = deltaScroll / (possibleSteps + 1);
          switch (motion) {
            case "linear": {
              const intermediateScrollCount = directionScroll !== 0 ? Math.floor(stepScroll) : 0;
              for (let offset = 1; offset < possibleSteps + 1; offset++) {
                const correctedDelayPerPosition = delayPerScroll + (offset % correctionDelayOccurrence === 0 ? 1 : 0);
                promises.push(Actionify.time.waitAsync(correctedDelayPerPosition + accumulatedDelay, () => mouseWheelScrollUp(intermediateScrollCount)));
                accumulatedDelay += correctedDelayPerPosition;
                accumulatedScroll += intermediateScrollCount;
              }
              break;
            }
            default:
              break;
          }
        }
        promises.push(Actionify.time.waitAsync(delay, () => mouseWheelScrollUp(finalScrollCount - accumulatedScroll)));
        return Promise.all(promises);
      }
      default:
        throw new Error(`Unsupported platform: ${OperatingSystemService.platform}`);
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
