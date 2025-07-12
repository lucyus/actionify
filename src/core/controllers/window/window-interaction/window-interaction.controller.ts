import path from "path";
import { Actionify } from "../../../../core";
import {
  closeWindow,
  focusWindow,
  listWindows,
  maximizeWindow,
  minimizeWindow,
  restoreWindow,
  setWindowDimensions,
  setWindowPosition,
  setWindowToAlwaysOnTop,
  setWindowToBottom,
  setWindowToTop,
  takeWindowScreenshotToFile,
} from "../../../../addon";
import type { WindowInfo } from "../../../../core/types";
import { Inspectable } from "../../../../core/utilities";

/**
 * @description Provide window information and interaction operations.
 */
export class WindowInteractionController {

  #windowInfo: WindowInfo;

  public constructor(windowInfo: WindowInfo) {
    this.#windowInfo = windowInfo;
  }

  #getById(id: number): WindowInfo | undefined {
    return listWindows().find((windowInfo) => windowInfo.id === id);
  }

  /**
   * @description The window handle number identifier (HWND).
   */
  public get id() {
    return this.#windowInfo.id;
  }

  /**
   * @description The process identifier (PID) of the window.
   */
  public get pid() {
    return this.#windowInfo.pid;
  }

  /**
   * @description The title of the window.
   */
  public get title() {
    return this.#getById(this.id)?.title ?? this.#windowInfo.title;
  }

  /**
   * @description The executable file of the window.
   */
  public get executableFile() {
    return this.#windowInfo.executableFile;
  }

  /**
   * @description The class name of the window.
   */
  public get className() {
    return this.#windowInfo.className;
  }

  /**
   * @description The position of the window.
   */
  public get position() {
    return this.#getById(this.id)?.position ?? this.#windowInfo.position;
  }

  /**
   * @description The dimensions (in pixels) of the window.
   */
  public get dimensions() {
    return this.#getById(this.id)?.dimensions ?? this.#windowInfo.dimensions;
  }

  /**
   * @description Whether the window is minimized.
   */
  public get isMinimized() {
    return this.#getById(this.id)?.isMinimized ?? this.#windowInfo.isMinimized;
  }

  /**
   * @description Whether the window is maximized.
   */
  public get isMaximized() {
    return this.#getById(this.id)?.isMaximized ?? this.#windowInfo.isMaximized;
  }

  /**
   * @description Whether the window is restored (neither minimized nor maximized).
   */
  public get isRestored() {
    return this.#getById(this.id)?.isRestored ?? this.#windowInfo.isRestored;
  }

  /**
   * @description Whether the window is focused (i.e. in the foreground).
   */
  public get isFocused() {
    return this.#getById(this.id)?.isFocused ?? this.#windowInfo.isFocused;
  }

  /**
   * @description Whether the window is always on top of other windows.
   */
  public get isAlwaysOnTop() {
    return this.#getById(this.id)?.isAlwaysOnTop ?? this.#windowInfo.isAlwaysOnTop;
  }

  /**
   * @description Minimize the window.
   *
   * @returns This window instance.
   *
   * ---
   * @example
   * // Get running windows
   * const windows = Actionify.window.list();
   * // Minimize the first window
   * windows[0].minimize();
   */
  public minimize() {
    if (this.isMinimized) {
      return this;
    }
    minimizeWindow(this.id);
    return this;
  }

  /**
   * @description Maximize the window to fit the screen it is on.
   *
   * @returns This window instance.
   *
   * ---
   * @example
   * // Get running windows
   * const windows = Actionify.window.list();
   * // Maximize the first window
   * windows[0].maximize();
   */
  public maximize() {
    if (this.isMaximized) {
      return this;
    }
    maximizeWindow(this.id);
    return this;
  }

  /**
   * @description Restore the window.
   * This is the opposite of `minimize`.
   *
   * @returns This window instance.
   *
   * ---
   * @example
   * // Get running windows
   * const windows = Actionify.window.list();
   * // Restore the first window
   * windows[0].restore();
   */
  public restore() {
    if (this.isRestored) {
      return this;
    }
    restoreWindow(this.id);
    return this;
  }

  /**
   * @description Close the window.
   * For some applications, this will also stop their process(es).
   *
   * @returns Whether the window is closed.
   *
   * ---
   * @example
   * // Get running windows
   * const windows = Actionify.window.list();
   * // Close the first window
   * windows[0].close();
   */
  public close() {
    return closeWindow(this.id);
  }

  /**
   * @description Put the window in the foreground and focus it.
   * If the window is initially minimized, it will be restored first.
   *
   * @returns This window instance.
   *
   * ---
   * @example
   * // Get running windows
   * const windows = Actionify.window.list();
   * // Focus the first window
   * windows[0].focus();
   */
  public focus() {
    if (this.isFocused) {
      return this;
    }
    if (this.isMinimized) {
      return this.restore();
    }
    focusWindow(this.id);
    return this;
  }

  /**
   * @description Move the window to a given position. If unset, the current window position will be used.
   * The position is relative to the main monitor (with origin in top-left corner at 0,0).
   *
   * @param x The new window X position.
   * @param y The new window Y position.
   * @returns A promise that resolves this window controller when the movement is completed.
   *
   * ---
   * @example
   * // Get running windows
   * const windows = Actionify.window.list();
   *
   * // Instant movement of the first window
   * windows[0].move(100, 100);
   *
   * // Delayed movement (in milliseconds) of the first window
   * await windows[0].move(100, 100, { delay: 1000 });
   *
   * // Linear motion over time of the first window
   * await windows[0].move(100, 100, { motion: "linear", delay: 1000, steps: "auto" });
   *
   * // Arc motion over time of the first window
   * await windows[0].move(100, 100, { motion: "arc", delay: 1000, steps: "auto" });
   *
   * // Wave motion over time of the first window
   * await windows[0].move(100, 100, { motion: "wave", delay: 1000, steps: "auto", frequency: "auto" });
   */
  public async move(x?: number, y?: number, options?: { steps?: number | "auto", delay?: number, motion?: "linear" | "arc" | "wave", curvinessFactor?: number, mirror?: boolean, frequency?: number | "auto" }) {
    if (this.isMinimized || this.isMaximized) {
      this.restore();
    }
    const steps = options?.steps === "auto" ? Infinity : Math.max(0, Math.round(options?.steps ?? 0));
    const delay = Math.max(0, Math.floor(options?.delay ?? 0));
    const curvinessFactor = options?.curvinessFactor !== undefined ? Math.max(0, Math.min(1, options.curvinessFactor)) : 0.1618;
    const mirror = options?.mirror ?? false;
    const motion = options?.motion ?? "linear";
    const initialX = this.position.x;
    const initialY = this.position.y;
    const newX = x ?? initialX;
    const newY = y ?? initialY;
    if (steps === 0 || delay === 0) {
      await Actionify.time.waitAsync(delay, () => setWindowPosition(this.id, newX, newY));
      return this;
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
    const promises: Promise<boolean>[] = [];
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
            promises.push(Actionify.time.waitAsync(correctedDelayPerPosition + accumulatedDelay, () => setWindowPosition(this.id, intermediateX, intermediateY)));
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
            promises.push(Actionify.time.waitAsync(correctedDelayPerPosition + accumulatedDelay, () => setWindowPosition(this.id, intermediateX, intermediateY)));
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
            promises.push(Actionify.time.waitAsync(correctedDelayPerPosition + accumulatedDelay, () => setWindowPosition(this.id, intermediateX, intermediateY)));
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
            promises.push(time.waitAsync(correctedDelayPerPosition + accumulatedDelay, () => setWindowPosition(this.id, intermediateX, intermediateY)));
            accumulatedDelay += correctedDelayPerPosition;
          }
          break;
        } */
        default:
          break;
      }
    }
    promises.push(Actionify.time.waitAsync(delay, () => setWindowPosition(this.id, newX, newY)));
    await Promise.all(promises);
    return this;
  }

  /**
   * @description Resize the window dimensions to a given size.
   *
   * @param width The new window width, in pixels.
   * @param height The new window height, in pixels.
   * @returns A promise that resolves this window controller when the resize is complete.
   *
   * ---
   * @example
   * // Get running windows
   * const windows = Actionify.window.list();
   *
   * // Instant resize of the first window
   * windows[0].resize(100, 100);
   *
   * // Delayed resize (in milliseconds) of the first window
   * await windows[0].resize(100, 100, { delay: 1000 });
   *
   * // Linear resize motion over time of the first window
   * await windows[0].resize(100, 100, { motion: "linear", delay: 1000, steps: "auto" });
   *
   * // Arc resize motion over time of the first window
   * await windows[0].resize(100, 100, { motion: "arc", delay: 1000, steps: "auto" });
   *
   * // Wave resize motion over time of the first window
   * await windows[0].resize(100, 100, { motion: "wave", delay: 1000, steps: "auto", frequency: "auto" });
   */
  public async resize(width?: number, height?: number, options?: { steps?: number | "auto", delay?: number, motion?: "linear" | "arc" | "wave", curvinessFactor?: number, mirror?: boolean, frequency?: number | "auto" }) {
    if (this.isMinimized || this.isMaximized) {
      this.restore();
    }
    const steps = options?.steps === "auto" ? Infinity : Math.max(0, Math.round(options?.steps ?? 0));
    const delay = Math.max(0, Math.floor(options?.delay ?? 0));
    const curvinessFactor = options?.curvinessFactor !== undefined ? Math.max(0, Math.min(1, options.curvinessFactor)) : 0.1618;
    const mirror = options?.mirror ?? false;
    const motion = options?.motion ?? "linear";
    const initialWidth = this.dimensions.width;
    const initialHeight = this.dimensions.height;
    const newWidth = width ?? initialWidth;
    const newHeight = height ?? initialHeight;
    if (steps === 0 || delay === 0) {
      await Actionify.time.waitAsync(delay, () => setWindowDimensions(this.id, newWidth, newHeight));
      return this;
    }
    //Calculate the line from start to end (the shortest diagonal)
    const dx = newWidth - initialWidth;
    const dy = newHeight - initialHeight;
    // Chebyshev distance
    const intermediatePositions = Math.max(0, Math.max(Math.abs(dx), Math.abs(dy)) - 1);
    const possibleSteps = Math.min(Math.floor(delay / 16.6), steps, intermediatePositions);
    const preciseDelayPerPosition = delay / (possibleSteps + 1);
    const delayPerPosition = Math.floor(preciseDelayPerPosition);
    let accumulatedDelay = 0;
    const promises: Promise<boolean>[] = [];
    if (possibleSteps > 0) {
      const correctionDelayOccurrence = preciseDelayPerPosition !== delayPerPosition ? Math.ceil(1 / (preciseDelayPerPosition - delayPerPosition)) : Infinity;
      const directionX = Math.sign(dx);
      const directionY = Math.sign(dy);
      const stepX = dx / (possibleSteps + 1);
      const stepY = dy / (possibleSteps + 1);
      switch (motion) {
        case "linear": {
          for (let offset = 1; offset < possibleSteps + 1; offset++) {
            const intermediateWidth = directionX !== 0 ? Math.round(initialWidth + offset * stepX) : newWidth;
            const intermediateHeight = directionY !== 0 ? Math.round(initialHeight + offset * stepY) : newHeight;
            const correctedDelayPerPosition = delayPerPosition + (offset % correctionDelayOccurrence === 0 ? 1 : 0);
            promises.push(Actionify.time.waitAsync(correctedDelayPerPosition + accumulatedDelay, () => setWindowDimensions(this.id, intermediateWidth, intermediateHeight)));
            accumulatedDelay += correctedDelayPerPosition;
          }
          break;
        }
        case "arc": {
          // Bézier curve
          const averageWidth = (initialWidth + newWidth) / 2;
          const averageHeight = (initialHeight + newHeight) / 2;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const perpendicularX = -dy / distance;
          const perpendicularY = dx / distance;
          const direction = mirror ? -1 : 1;
          const controlX = averageWidth + curvinessFactor * distance * perpendicularX * direction;
          const controlY = averageHeight + curvinessFactor * distance * perpendicularY * direction;
          for (let offset = 1; offset < possibleSteps + 1; offset++) {
            const t = offset / (possibleSteps + 1);
            const intermediateWidth = Math.round((1 - t) * (1 - t) * initialWidth + 2 * (1 - t) * t * controlX + t * t * newWidth);
            const intermediateHeight = Math.round((1 - t) * (1 - t) * initialHeight + 2 * (1 - t) * t * controlY + t * t * newHeight);
            const correctedDelayPerPosition = delayPerPosition + (offset % correctionDelayOccurrence === 0 ? 1 : 0);
            promises.push(Actionify.time.waitAsync(correctedDelayPerPosition + accumulatedDelay, () => setWindowDimensions(this.id, intermediateWidth, intermediateHeight)));
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
            const intermediateWidth = Math.round(initialWidth + t * dx + directionY * sineWaveOffset);
            const intermediateHeight = Math.round(initialHeight + t * dy - directionX * sineWaveOffset);
            const correctedDelayPerPosition = delayPerPosition + (offset % correctionDelayOccurrence === 0 ? 1 : 0);
            promises.push(Actionify.time.waitAsync(correctedDelayPerPosition + accumulatedDelay, () => setWindowDimensions(this.id, intermediateWidth, intermediateHeight)));
            accumulatedDelay += correctedDelayPerPosition;
          }
          break;
        }
        /* case "circle": {
          // Determine radius using Euclidean distance
          const diameter = Math.sqrt(dx * dx + dy * dy);
          const radius = Math.round(diameter / 2);

          // Determine midwidth
          const averageWidth = (initialWidth + newWidth) / 2;
          const averageHeight = (initialHeight + newHeight) / 2;

          // Calculate the angle increment for each step
          const startAngle = Math.atan2(initialHeight - averageHeight, initialWidth - averageWidth); // Angle of initial point
          const endAngle = Math.atan2(newHeight - averageHeight, newWidth - averageWidth); // Angle of final point

          const direction = mirror ? -1 : 1;

          // Half-circle movement implies that the arc is in a 180-degree range
          const angleDifference = (endAngle - startAngle) * direction;

          // Ensure the angle difference is between -π and π (normalize angle range)
          const angleStep = angleDifference / (possibleSteps + 1);

          for (let offset = 1; offset < possibleSteps + 1; offset++) {
            const angle = startAngle + offset * angleStep;
            // Calculate intermediate point on the arc
            const intermediateX = Math.round(averageWidth + radius * Math.cos(angle));
            const intermediateY = Math.round(averageHeight + radius * Math.sin(angle));

            // Set the cursor position at computed position and at given delay
            const correctedDelayPerPosition = delayPerPosition + (offset % correctionDelayOccurrence === 0 ? 1 : 0);
            promises.push(time.waitAsync(correctedDelayPerPosition + accumulatedDelay, () => setWindowDimensions(this.id, intermediateX, intermediateY)));
            accumulatedDelay += correctedDelayPerPosition;
          }
          break;
        } */
        default:
          break;
      }
    }
    promises.push(Actionify.time.waitAsync(delay, () => setWindowDimensions(this.id, newWidth, newHeight)));
    await Promise.all(promises);
    return this;
  }

  /**
   * @description Move the window to the foreground.
   * If the window is initially minimized, it will be restored first.
   *
   * @returns This window instance.
   *
   * ---
   * @example
   * // Get running windows
   * const windows = Actionify.window.list();
   * // Move the first window to the foreground
   * windows[0].top();
   */
  public top() {
    if (this.isMinimized) {
      this.restore();
    }
    setWindowToTop(this.id);
    return this;
  }

  /**
   * @description Move the window to the background.
   * If the window is initially minimized, it will be restored first.
   *
   * @returns This window instance.
   *
   * ---
   * @example
   * // Get running windows
   * const windows = Actionify.window.list();
   * // Move the first window to the background
   * windows[0].bottom();
   */
  public bottom() {
    if (this.isMinimized) {
      this.restore();
    }
    setWindowToBottom(this.id);
    return this;
  }

  /**
   * @description Take a screenshot of the window and save it to a PNG file.
   *
   * @param x The top-left corner X position of the screenshot, relative to the window. If unset, it defaults to `0`.
   * @param y The top-left corner Y position of the screenshot, relative to the window. If unset, it defaults to `0`.
   * @param width The width of the screenshot in pixels. If unset, the width of the window will be used.
   * @param height The height of the screenshot in pixels. If unset, the height of the window will be used.
   * @param options.filepath The file path to save the screenshot to. If unset, it will be saved in the current working directory as `screenshot_[year]-[month]-[day]_[hour]-[minute]-[second]-[millisecond].png`.
   * @param options.scale The scale factor to apply to the screenshot. If unset, it defaults to `1.0`.
   * @returns The absolute filepath of the screenshot.
   * @throws An error is thrown if the window does not allow screenshots (e.g.:
   * the window is running as administrator but Actionify is not, the window no
   * longer exists, etc.).
   *
   * ---
   * @example
   * // Select a window to take a screenshot of, here we take the first window
   * const window = Actionify.window.list()[0];
   *
   * try {
   *   // Take a screenshot of the entire window
   *   const screenshotFilepath = window.shot();
   *
   *   // Take a screenshot of a specific area of the window
   *   const screenshotFilepath = window.shot(100, 100, 400, 200);
   *
   *   // Take a screenshot of the window and save it to a specific file
   *   const screenshotFilepath = window.shot(100, 100, 400, 200, { filepath: "/path/to/screenshot.png" });
   *
   *   // Take a screenshot of the window and apply a scale factor
   *   const screenshotFilepath = window.shot(100, 100, 400, 200, { scale: 2.0 });
   * }
   * catch (error) {
   *   // Handle potential errors here (some windows does not allow screenshots)...
   * }
   */
  public shot(x?: number, y?: number, width?: number, height?: number, options?: { filepath?: string, scale?: number }): string {
    const now = new Date();
    const defaultFilepath = `screenshot_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}-${String(now.getMinutes()).padStart(2, "0")}-${String(now.getSeconds()).padStart(2, "0")}-${String(now.getMilliseconds()).padStart(3, "0")}.png`;
    const absoluteFilePath = path.resolve(options?.filepath ?? defaultFilepath);
    const scale = options?.scale ?? 1.0;
    const hasTakenScreenshot = takeWindowScreenshotToFile(this.id, x ?? 0, y ?? 0, width ?? this.dimensions.width, height ?? this.dimensions.height, absoluteFilePath, scale);
    if (!hasTakenScreenshot) {
      throw new Error(`Failed to take a screenshot of the window with ID ${this.id}. The window may not allow screenshots, is running as administrator while Actionify is not, or may no longer exist.`);
    }
    return absoluteFilePath;
  }

  /**
   * @description Set the window into the top (normal) or topmost (always on top) category.
   * If the window is initially minimized, it will be restored first.
   *
   * @param shouldBeAlwaysOnTop Whether the window should be always on top of other windows (topmost category).
   * @returns This window instance.
   *
   * ---
   * @example
   * // Get running windows
   * const windows = Actionify.window.list();
   * // Set the first window into the topmost (always on top) category
   * windows[0].alwaysOnTop();
   * // Set the first window into the top (default) category
   * windows[0].alwaysOnTop(false);
   */
  public alwaysOnTop(shouldBeAlwaysOnTop: boolean = true) {
    if (this.isMinimized) {
      this.restore();
    }
    setWindowToAlwaysOnTop(this.id, shouldBeAlwaysOnTop);
    return this;
  }

  /**
   * @description Customize the default inspect output (with `console.log`) of a
   * class instance.
   */
  public [Symbol.for('nodejs.util.inspect.custom')](depth: number, inspectOptions: object, inspect: Function) {
    return Inspectable.format(this, depth, inspectOptions, inspect);
  }

}
