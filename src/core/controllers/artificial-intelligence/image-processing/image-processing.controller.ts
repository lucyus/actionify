import path from "path";
import { Actionify } from "../../../../core";
import {
  findImageTemplateMatches,
  performOcrOnImage,
} from "../../../../addon";
import type { MatchRegion } from "../../../../core/types";
import { Inspectable } from "../../../../core/utilities";

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
export class ImageProcessingController {

  readonly #absoluteFilePath: string;

  public constructor(absoluteFilePath: string) {
    this.#absoluteFilePath = absoluteFilePath;
  }

  /**
   * @description Perform OCR (Optical Character Recognition) on an image to extract text from it.
   *
   * @param language The language to use for OCR. If unset, the default language will be used (Windows Settings > Time and Language > Language).
   * @returns The text extracted from the image.
   *
   * ---
   * @example
   * // Extract text from an image using system default language
   * const text = Actionify.ai.image("/path/to/image.png").text();
   * // Extract text from an image using English
   * const text = Actionify.ai.image("/path/to/image.png").text("en");
   * // Extract text from an image using French
   * const text = Actionify.ai.image("/path/to/image.png").text("fr");
   * // Extract text from an image using German
   * const text = Actionify.ai.image("/path/to/image.png").text("de");
   * // Extract text from an image using Spanish
   * const text = Actionify.ai.image("/path/to/image.png").text("es");
   * // Extract text from an image using Italian
   * const text = Actionify.ai.image("/path/to/image.png").text("it");
   * // Extract text from an image using Portuguese
   * const text = Actionify.ai.image("/path/to/image.png").text("pt");
   * // Extract text from an image using Russian
   * const text = Actionify.ai.image("/path/to/image.png").text("ru");
   * // Extract text from an image using Simplified Chinese
   * const text = Actionify.ai.image("/path/to/image.png").text("zh-CN");
   * // Extract text from an image using Traditional Chinese
   * const text = Actionify.ai.image("/path/to/image.png").text("zh-TW");
   * // Extract text from an image using Japanese
   * const text = Actionify.ai.image("/path/to/image.png").text("ja");
   * // Extract text from an image using Korean
   * const text = Actionify.ai.image("/path/to/image.png").text("ko");
   * // Extract text from an image using Arabic
   * const text = Actionify.ai.image("/path/to/image.png").text("ar");
   */
  public text(language?: string) {
    return performOcrOnImage(this.#absoluteFilePath, language);
  }

  /**
   * @description Finds all occurrences of the given sub-image in the given image.
   *
   * @param filepath The path to the sub-image file to find inside the previously given image.
   * @returns {MatchRegion[]} A sorted array of regions from most to less likely containing the given sub-image.
   *
   * ---
   * @example
   *
   * // Find regions in the image, ranked from most to least likely to match the given sub-image
   * const matches = Actionify.ai.image("/path/to/image.png").find("/path/to/sub-image.png");
   *
   * // Find regions in the image that exactly match the given sub-image
   * const perfectMatches = Actionify.ai.image("/path/to/image.png").find("/path/to/sub-image.png", { minSimilarity: 1 });
   *
   * // Find all regions in the image, ordered from most to least likely to contain the given sub-image
   * const allMatches = Actionify.ai.image("/path/to/image.png").find("/path/to/sub-image.png", { minSimilarity: 0 });
   */
  public find(filepath: string, options?: { minSimilarity?: number }): MatchRegion[] {
    if (!Actionify.filesystem.exists(filepath)) {
      throw new Error(`File does not exist: ${filepath}`);
    }
    // Initialize variables
    const minSimilarity = Math.max(0, Math.min(1, options?.minSimilarity ?? 0.5));
    const absoluteSubFilePath = path.resolve(filepath);
    // Find matches
    const rawResults = findImageTemplateMatches(this.#absoluteFilePath, absoluteSubFilePath, minSimilarity);
    // Map results
    const result = [];
    for (let rawIndex = 0; rawIndex < rawResults.length; rawIndex += 5) {
      const similarity = rawResults[rawIndex + 4];
      if (minSimilarity > 0 && similarity < minSimilarity) {
        break;
      }
      result.push({
        position: {
          x: rawResults[rawIndex],
          y: rawResults[rawIndex + 1],
        },
        dimensions: {
          width: rawResults[rawIndex + 2],
          height: rawResults[rawIndex + 3],
        },
        similarity: similarity,
      });
    }
    return result;
  }

  /**
   * @description Customize the default inspect output (with `console.log`) of a
   * class instance.
   */
  public [Symbol.for('nodejs.util.inspect.custom')](depth: number, inspectOptions: object, inspect: Function) {
    return Inspectable.format(this, depth, inspectOptions, inspect);
  }

}
