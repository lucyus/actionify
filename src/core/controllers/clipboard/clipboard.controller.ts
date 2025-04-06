import path from "path";
import { Actionify } from "../../../core";
import {
  copyFileToClipboard,
  copyTextToClipboard,
} from "../../../addon";
import { Inspectable } from "../../../core/utilities";

/**
 * @description Common clipboard operations.
 */
export class ClipboardController {

  public constructor() { }

  /**
   * @description Copy text or a file to the clipboard.
   *
   * @param textOrFilePath The text or the existing file to copy to the clipboard.
   * @returns The text or the absolute filepath of the copied file.
   *
   * ---
   * @example
   * // Copy text to the clipboard
   * Actionify.clipboard.copy("Hello world!");
   *
   * // Copy a file to the clipboard
   * Actionify.clipboard.copy("/path/to/file.extension");
   */
  public copy(textOrFilePath: string) {
    // if argument is a valid file path
    if (Actionify.filesystem.exists(textOrFilePath)) {
      const filePath = textOrFilePath;
      const absoluteFilePath = path.resolve(filePath);
      copyFileToClipboard(absoluteFilePath);
      return absoluteFilePath;
    }
    const text = textOrFilePath;
    copyTextToClipboard(text);
    return text;
  }

  /**
   * @description Paste the content of the clipboard.
   *
   * ---
   * @example
   * Actionify.clipboard.paste();
   */
  public paste() {
    Actionify.keyboard.down("ctrl");
    Actionify.keyboard.tap("v");
    Actionify.keyboard.up("ctrl");
  }

  /**
   * @description Customize the default inspect output (with `console.log`) of a
   * class instance.
   */
  public [Symbol.for('nodejs.util.inspect.custom')](depth: number, inspectOptions: object, inspect: Function) {
    return Inspectable.format(this, depth, inspectOptions, inspect);
  }

}
