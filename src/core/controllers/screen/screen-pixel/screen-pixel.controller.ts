import { Actionify } from "../../../../core";
import {
  getPixelColor,
} from "../../../../addon";
import type { Color } from "../../../../core/types";
import { Inspectable } from "../../../../core/utilities";

/**
 * @description Screen pixel management.
 */
export class ScreenPixelController {

  public constructor() { }

  /**
   * @description Get the color of a pixel.
   * The pixel position is relative to the main monitor (with origin in top-left corner at 0,0).
   *
   * @param x Pixel X position. If unset, the current mouse X position will be used.
   * @param y Pixel Y position. If unset, the current mouse Y position will be used.
   * @returns The color of the pixel in RGB format.
   *
   * ---
   * @example
   * // Get the color of the pixel at the current mouse position
   * const color = Actionify.screen.pixel.color();
   *
   * // Get the color of the pixel at a specific position
   * const color = Actionify.screen.pixel.color(100, 100);
   */
  public color(x?: number, y?: number): Color {
    return getPixelColor(x ?? Actionify.mouse.x, y ?? Actionify.mouse.y);
  }

  /**
   * @description Customize the default inspect output (with `console.log`) of a
   * class instance.
   */
  public [Symbol.for('nodejs.util.inspect.custom')](depth: number, inspectOptions: object, inspect: Function) {
    return Inspectable.format(this, depth, inspectOptions, inspect);
  }

}
