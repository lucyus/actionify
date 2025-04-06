import path from "path";
import { Actionify } from "../../../core";
import { ImageProcessingController } from "../../../core/controllers";
import { Inspectable } from "../../../core/utilities";

/**
 * @description Artificial Intelligence based operations.
 */
export class ArtificialIntelligenceController {

  public constructor() { }

  /**
   * @description Artificial Intelligence algorithms for image processing.
   *
   * @param filepath The path to the image file to process.
   * @returns The image processing functions.
   *
   * ---
   * @example
   * // Perform OCR on an image
   * const text = Actionify.ai.image("/path/to/image.png").text();
   *
   * // Locate a sub-image using Image Template Matching
   * const matches = Actionify.ai.image("/path/to/image.png").find("/path/to/sub-image.png");
   */
  public image(filepath: string) {
    if (!Actionify.filesystem.exists(filepath)) {
      throw new Error(`File does not exist: ${filepath}`);
    }
    const absoluteFilePath = path.resolve(filepath);
    return new ImageProcessingController(absoluteFilePath);
  }

  /**
   * @description Customize the default inspect output (with `console.log`) of a
   * class instance.
   */
  public [Symbol.for('nodejs.util.inspect.custom')](depth: number, inspectOptions: object, inspect: Function) {
    return Inspectable.format(this, depth, inspectOptions, inspect);
  }

}
