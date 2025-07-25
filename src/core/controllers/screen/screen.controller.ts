import path from "path";
import {
  getAvailableScreens,
  takeScreenshotToFile,
} from "../../../addon";
import { ScreenPixelController } from "../../../core/controllers";
import type { ScreenInfo } from "../../../core/types";
import { Inspectable } from "../../../core/utilities";

/**
 * @description Screen information and interaction.
 */
export class ScreenController {

  /**
   * @description Screen pixel management.
   */
  readonly pixel: ScreenPixelController;

  public constructor() {
    this.pixel = new ScreenPixelController();
  }

  /**
   * @description Get information for each available screen.
   * The first screen is the main monitor.
   *
   * @returns The list of available screens.
   *
   * ---
   * @example
   * const screens = Actionify.screen.list();
   */
  public list(): ScreenInfo[] {
    return getAvailableScreens();
  }

  /**
   * @description Take a screenshot and save it to a PNG file.
   *
   * @param x The top-left corner X position of the screenshot. If unset, the current mouse X position will be used.
   * @param y The top-left corner Y position of the screenshot. If unset, the current mouse Y position will be used.
   * @param width The width of the screenshot in pixels. If unset, the width of the main monitor will be used.
   * @param height The height of the screenshot in pixels. If unset, the height of the main monitor will be used.
   * @param options.filepath The file path to save the screenshot to. If unset, it will be saved in the current working directory as `screenshot_[year]-[month]-[day]_[hour]-[minute]-[second]-[millisecond].png`.
   * @param options.scale The scale factor to apply to the screenshot. If unset, it defaults to 1.0.
   * @returns The absolute filepath of the screenshot.
   *
   * ---
   * @example
   * // Take a screenshot of the main monitor
   * const screenshotFilepath = Actionify.screen.shot();
   *
   * // Take a screenshot of a specific area
   * const screenshotFilepath = Actionify.screen.shot(100, 100, 400, 200);
   *
   * // Take a screenshot and save it to a specific file
   * const screenshotFilepath = Actionify.screen.shot(100, 100, 400, 200, { filepath: "/path/to/screenshot.png" });
   *
   * // Take a screenshot and apply a scale factor
   * const screenshotFilepath = Actionify.screen.shot(100, 100, 400, 200, { scale: 2.0 });
   */
  public shot(x?: number, y?: number, width?: number, height?: number, options?: { filepath?: string, scale?: number }): string {
    const mainMonitor = this.list()[0];
    const now = new Date();
    const defaultFilepath = `screenshot_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}-${String(now.getMinutes()).padStart(2, "0")}-${String(now.getSeconds()).padStart(2, "0")}-${String(now.getMilliseconds()).padStart(3, "0")}.png`;
    const absoluteFilePath = path.resolve(options?.filepath ?? defaultFilepath);
    const scale = options?.scale ?? 1.0;
    takeScreenshotToFile(x ?? mainMonitor.origin.x, y ?? mainMonitor.origin.y, width ?? mainMonitor.dimensions.width, height ?? mainMonitor.dimensions.height, absoluteFilePath, scale);
    return absoluteFilePath;
  }

  /**
   * @description Customize the default inspect output (with `console.log`) of a
   * class instance.
   */
  public [Symbol.for('nodejs.util.inspect.custom')](depth: number, inspectOptions: object, inspect: Function) {
    return Inspectable.format(this, depth, inspectOptions, inspect);
  }

}
