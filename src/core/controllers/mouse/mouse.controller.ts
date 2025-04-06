import { Actionify } from "../../../core";
import {
  getCursorPos,
  setCursorPos,
} from "../../../addon";
import {
  MouseEventsController,
  MouseLeftController,
  MouseMiddleController,
  MouseRightController,
  MouseScrollController,
  MouseTracksController
} from "../../../core/controllers";
import { Inspectable } from "../../../core/utilities";

/**
 * @description Common mouse operations.
 */
export class MouseController {

  #mouseEventsController: MouseEventsController;
  #mouseLeftController: MouseLeftController;
  #mouseMiddleController: MouseMiddleController;
  #mouseRightController: MouseRightController;
  #mouseScrollController: MouseScrollController;
  #mouseTracksController: MouseTracksController;

  public constructor() {
    this.#mouseEventsController = new MouseEventsController();
    this.#mouseLeftController = new MouseLeftController();
    this.#mouseMiddleController = new MouseMiddleController();
    this.#mouseRightController = new MouseRightController();
    this.#mouseScrollController = new MouseScrollController();
    this.#mouseTracksController = new MouseTracksController();
  }

  /**
   * @description Get current mouse X position.
   * The position is relative to the main monitor (with origin in top-left corner at 0,0).
   *
   * @returns Current mouse X position.
   *
   * ---
   * @example
   * const mouseX = Actionify.mouse.x;
   */
  public get x() {
    return getCursorPos.x;
  }

  /**
   * @description Set current mouse X position.
   *
   * @param x New mouse X position relative to the main monitor (with origin in top-left corner at 0,0).
   *
   * ---
   * @example
   * Actionify.mouse.x = 100;
   */
  public set x(x: number) {
    setCursorPos(x, this.y);
  }

  /**
   * @description Get current mouse Y position.
   * The position is relative to the main monitor (with origin in top-left corner at 0,0).
   *
   * @returns Current mouse Y position.
   *
   * ---
   * @example
   * const mouseY = Actionify.mouse.y;
   */
  public get y() {
    return getCursorPos.y;
  }

  /**
   * @description Set current mouse Y position.
   *
   * @param y New mouse Y position relative to the main monitor (with origin in top-left corner at 0,0).
   *
   * ---
   * @example
   * Actionify.mouse.y = 100;
   */
  public set y(y: number) {
    setCursorPos(this.x, y);
  }

  /**
   * @description Mouse events listening manager.
   */
  public get events(): MouseEventsController {
    return this.#mouseEventsController;
  }

  /**
   * @description Mouse events recorder and replayer.
   */
  public get track(): MouseTracksController {
    return this.#mouseTracksController;
  }

  /**
   * @description Simulate mouse left button press and/or release.
   */
  public get left(): MouseLeftController {
    return this.#mouseLeftController;
  }

  /**
   * @description Simulate mouse middle button press and/or release.
   */
  public get middle(): MouseMiddleController {
    return this.#mouseMiddleController;
  }

  /**
   * @description Simulate mouse right button press and/or release.
   */
  public get right(): MouseRightController {
    return this.#mouseRightController;
  }

  /**
   * @description Simulate mouse wheel scroll down or up.
   */
  public get scroll(): MouseScrollController {
    return this.#mouseScrollController;
  }

  /**
   * @description Move the mouse to a given position.
   * The position is relative to the main monitor (with origin in top-left corner at 0,0).
   *
   * @param x The new mouse X position. If unset, the current mouse X position will be used.
   * @param y The new mouse Y position. If unset, the current mouse Y position will be used.
   * @param options Additional mouse movement options (delay, motion, intermediate positions, etc.).
   * @returns A promise that resolves when the mouse movement is complete.
   *
   * ---
   * @example
   * // Instant movement
   * Actionify.mouse.move(100, 100);
   *
   * // Delayed movement in milliseconds
   * await Actionify.mouse.move(100, 100, { delay: 1000 });
   *
   * // Linear motion over time
   * await Actionify.mouse.move(100, 100, { motion: "linear", delay: 1000, steps: "auto" });
   *
   * // Arc motion over time
   * await Actionify.mouse.move(100, 100, { motion: "arc", delay: 1000, steps: "auto" });
   *
   * // Wave motion over time
   * await Actionify.mouse.move(100, 100, { motion: "wave", delay: 1000, steps: "auto", frequency: "auto" });
   */
  public move(x?: number, y?: number, options?: { steps?: number | "auto", delay?: number, motion?: "linear" | "arc" | "wave", curvinessFactor?: number, mirror?: boolean, frequency?: number | "auto" }) {
    const steps = options?.steps === "auto" ? Infinity : Math.max(0, Math.round(options?.steps ?? 0));
    const delay = Math.max(0, Math.floor(options?.delay ?? 0));
    const curvinessFactor = options?.curvinessFactor !== undefined ? Math.max(0, Math.min(1, options.curvinessFactor)) : 0.1618;
    const mirror = options?.mirror ?? false;
    const motion = options?.motion ?? "linear";
    const initialX = this.x;
    const initialY = this.y;
    const newX = x ?? initialX;
    const newY = y ?? initialY;
    if (steps === 0 || delay === 0) {
      return Actionify.time.waitAsync(delay, () => setCursorPos(newX, newY));
    }
    //Calculate the line from start to end (the shortest diagonal)
    const dx = newX - initialX;
    const dy = newY - initialY;
    // Chebyshev distance
    const intermediatePositions = Math.max(0, Math.max(Math.abs(dx), Math.abs(dy)) - 1);
    const possibleSteps = Math.min(delay, steps, intermediatePositions);
    const preciseDelayPerPosition = delay / (possibleSteps + 1);
    const delayPerPosition = Math.floor(preciseDelayPerPosition);
    let accumulatedDelay = 0;
    const promises: Promise<void>[] = [];
    if (possibleSteps > 0) {
      const correctionDelayOccurrence = preciseDelayPerPosition !== delayPerPosition ? Math.ceil(1 / (preciseDelayPerPosition - delayPerPosition)) : Infinity;
      const directionX = Math.sign(dx);
      const directionY = Math.sign(dy);
      const stepX = dx / (possibleSteps + 1);
      const stepY = dy / (possibleSteps + 1);
      switch (motion) {
        case "linear": {
          for (let offset = 1; offset < possibleSteps + 1; offset++) {
            const intermediateX = directionX !== 0 ? Math.round(initialX + offset * stepX) : newX;
            const intermediateY = directionY !== 0 ? Math.round(initialY + offset * stepY) : newY;
            const correctedDelayPerPosition = delayPerPosition + (offset % correctionDelayOccurrence === 0 ? 1 : 0);
            promises.push(Actionify.time.waitAsync(correctedDelayPerPosition + accumulatedDelay, () => setCursorPos(intermediateX, intermediateY)));
            accumulatedDelay += correctedDelayPerPosition;
          }
          break;
        }
        case "arc": {
          // Bézier curve
          const midpointX = (initialX + newX) / 2;
          const midpointY = (initialY + newY) / 2;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const perpendicularX = -dy / distance;
          const perpendicularY = dx / distance;
          const direction = mirror ? -1 : 1;
          const controlX = midpointX + curvinessFactor * distance * perpendicularX * direction;
          const controlY = midpointY + curvinessFactor * distance * perpendicularY * direction;
          for (let offset = 1; offset < possibleSteps + 1; offset++) {
            const t = offset / (possibleSteps + 1);
            const intermediateX = Math.round((1 - t) * (1 - t) * initialX + 2 * (1 - t) * t * controlX + t * t * newX);
            const intermediateY = Math.round((1 - t) * (1 - t) * initialY + 2 * (1 - t) * t * controlY + t * t * newY);
            const correctedDelayPerPosition = delayPerPosition + (offset % correctionDelayOccurrence === 0 ? 1 : 0);
            promises.push(Actionify.time.waitAsync(correctedDelayPerPosition + accumulatedDelay, () => setCursorPos(intermediateX, intermediateY)));
            accumulatedDelay += correctedDelayPerPosition;
          }
          break;
        }
        case "wave": {
          const rawMaxFrequency = Math.floor((possibleSteps + 1) / 30 / 2);
          const maxFrequency = rawMaxFrequency % 2 === 0 ? rawMaxFrequency : rawMaxFrequency - 1;
          const frequency = options?.frequency !== undefined ? Math.max(2, Math.min(maxFrequency, options.frequency === "auto" ? maxFrequency : Math.round(options.frequency * 2))) : 2;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const halfDistance = distance / 2;
          const amplitude = curvinessFactor * halfDistance;
          const mirrorDirection = mirror ? -1 : 1;
          const directionX = dx / distance;
          const directionY = dy / distance;
          for (let offset = 1; offset < possibleSteps + 1; offset++) {
            const t = offset / (possibleSteps + 1);
            const sineWaveOffset = Math.sin(t * Math.PI * frequency) * amplitude * mirrorDirection;
            const intermediateX = Math.round(initialX + t * dx + directionY * sineWaveOffset);
            const intermediateY = Math.round(initialY + t * dy - directionX * sineWaveOffset);
            const correctedDelayPerPosition = delayPerPosition + (offset % correctionDelayOccurrence === 0 ? 1 : 0);
            promises.push(Actionify.time.waitAsync(correctedDelayPerPosition + accumulatedDelay, () => setCursorPos(intermediateX, intermediateY)));
            accumulatedDelay += correctedDelayPerPosition;
          }
          break;
        }
        /* case "circle": {
          // Determine radius using Euclidean distance
          const diameter = Math.sqrt(dx * dx + dy * dy);
          const radius = Math.round(diameter / 2);

          // Determine midpoint
          const midpointX = (initialX + newX) / 2;
          const midpointY = (initialY + newY) / 2;

          // Calculate the angle increment for each step
          const startAngle = Math.atan2(initialY - midpointY, initialX - midpointX); // Angle of initial point
          const endAngle = Math.atan2(newY - midpointY, newX - midpointX); // Angle of final point

          const direction = mirror ? -1 : 1;

          // Half-circle movement implies that the arc is in a 180-degree range
          const angleDifference = (endAngle - startAngle) * direction;

          // Ensure the angle difference is between -π and π (normalize angle range)
          const angleStep = angleDifference / (possibleSteps + 1);

          for (let offset = 1; offset < possibleSteps + 1; offset++) {
            const angle = startAngle + offset * angleStep;
            // Calculate intermediate point on the arc
            const intermediateX = Math.round(midpointX + radius * Math.cos(angle));
            const intermediateY = Math.round(midpointY + radius * Math.sin(angle));

            // Set the cursor position at computed position and at given delay
            const correctedDelayPerPosition = delayPerPosition + (offset % correctionDelayOccurrence === 0 ? 1 : 0);
            promises.push(time.waitAsync(correctedDelayPerPosition + accumulatedDelay, () => setCursorPos(intermediateX, intermediateY)));
            accumulatedDelay += correctedDelayPerPosition;
          }
          break;
        } */
        default:
          break;
      }
    }
    promises.push(Actionify.time.waitAsync(delay, () => setCursorPos(newX, newY)));
    return Promise.all(promises);
  }

  /**
   * @description Customize the default inspect output (with `console.log`) of a
   * class instance.
   */
  public [Symbol.for('nodejs.util.inspect.custom')](depth: number, inspectOptions: object, inspect: Function) {
    return Inspectable.format(this, depth, inspectOptions, inspect);
  }

}
