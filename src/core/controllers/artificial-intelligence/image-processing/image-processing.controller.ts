import fs from "fs/promises";
import path from "path";
import { RepositoryHelper } from "../../../../cli/actionify/helpers";
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
   * @param language The {@link https://tesseract-ocr.github.io/tessdoc/Data-Files-in-different-versions|language code} to use for OCR.
   * If unset, it will default to the first available language installed locally.
   * @returns A promise that resolves to the text extracted from the image.
   *
   * ---
   * @example
   * // Extract text from an image using the first available local OCR language
   * const text = await Actionify.ai.image("/path/to/image.png").text();
   * // Extract text from an image using English
   * const text = await Actionify.ai.image("/path/to/image.png").text("eng");
   * // Extract text from an image using French
   * const text = await Actionify.ai.image("/path/to/image.png").text("fra");
   * // Extract text from an image using German
   * const text = await Actionify.ai.image("/path/to/image.png").text("deu");
   * // Extract text from an image using Spanish
   * const text = await Actionify.ai.image("/path/to/image.png").text("spa");
   * // Extract text from an image using Italian
   * const text = await Actionify.ai.image("/path/to/image.png").text("ita");
   * // Extract text from an image using Portuguese
   * const text = await Actionify.ai.image("/path/to/image.png").text("por");
   * // Extract text from an image using Russian
   * const text = await Actionify.ai.image("/path/to/image.png").text("rus");
   * // Extract text from an image using Simplified Chinese
   * const text = await Actionify.ai.image("/path/to/image.png").text("chi_sim");
   * // Extract text from an image using Traditional Chinese
   * const text = await Actionify.ai.image("/path/to/image.png").text("chi_tra");
   * // Extract text from an image using Japanese
   * const text = await Actionify.ai.image("/path/to/image.png").text("jpn");
   * // Extract text from an image using Korean
   * const text = await Actionify.ai.image("/path/to/image.png").text("kor");
   * // Extract text from an image using Arabic
   * const text = await Actionify.ai.image("/path/to/image.png").text("ara");
   */
  public async text(language?: string) {
    try {
      const ocrLanguageCode = language ?? (await this.#fetchDefaultLocalTtsModelIfExistsElseThrow());
      return performOcrOnImage(this.#absoluteFilePath, ocrLanguageCode);
    }
    catch (error: any) {
      if (error?.message?.includes("Failed to initialize Tesseract with language")) {
        throw new Error([
          ``,
          `==========================================`,
          `OCR language "${language ?? "eng"}" not found.`,
          `Install it using the following command:`,
          `    \x1b[96mnpx actionify ocr language add ${language ?? "eng"}\x1b[0m`,
          `==========================================`,
        ].join("\n"));
      }
      throw error;
    }
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

  async #fetchDefaultLocalTtsModelIfExistsElseThrow() {
    const ocrDataFolderPath = await RepositoryHelper.resolveDataDirectory(["ocr"]);
    const localOcrTrainedDataFileNames = (await fs.readdir(ocrDataFolderPath, { withFileTypes: true }))
      .filter((fileOrDirectory) => fileOrDirectory.isFile())
      .map((directory) => directory.name.replace(".traineddata", ""));
    ;
    if (localOcrTrainedDataFileNames.length > 0) {
      return localOcrTrainedDataFileNames[0];
    }
    throw new Error([
      ``,
      `==========================================`,
      `No OCR languages installed locally.`,
      `Browse the list of available languages using the following command:`,
      `    \x1b[96mnpx actionify ocr language list\x1b[0m`,
      `Then install one using the following command:`,
      `    \x1b[96mnpx actionify ocr language add <language>\x1b[0m`,
      `==========================================`,
    ].join("\n"));
  }

  /**
   * @description Customize the default inspect output (with `console.log`) of a
   * class instance.
   */
  public [Symbol.for('nodejs.util.inspect.custom')](depth: number, inspectOptions: object, inspect: Function) {
    return Inspectable.format(this, depth, inspectOptions, inspect);
  }

}
