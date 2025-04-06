import fs from "fs";
import path from "path";
import { Inspectable } from "../../../core/utilities";

/**
 * @description Common filesystem operations.
 */
export class FilesystemController {

  static readonly #fileWriters: Map<string, fs.WriteStream> = new Map<string, fs.WriteStream>();

  public constructor() { }

  /**
   * @description Check if a file is readable.
   *
   * @param filePath Path to the file.
   * @returns Whether the file can be read.
   *
   * ---
   * @example
   * const isReadable = Actionify.filesystem.canRead("path/to/file.extension");
   */
  public canRead(filePath: string) {
    try {
      fs.accessSync(filePath, fs.constants.R_OK);
      return true;
    }
    catch (error) {
      return false;
    }
  }

  /**
   * @description Check if a file is writable.
   *
   * @param filePath Path to the file.
   * @returns Whether the file can be written to.
   *
   * ---
   * @example
   * const isWritable = Actionify.filesystem.canWrite("path/to/file.extension");
   */
  public canWrite(filePath: string) {
    try {
      fs.accessSync(filePath, fs.constants.W_OK);
      return true;
    }
    catch (error) {
      return false;
    }
  }

  /**
   * @description Check if a file is executable.
   *
   * @param filePath Path to the file.
   * @returns Whether the file can be executed.
   *
   * ---
   * @example
   * const isExecutable = Actionify.filesystem.canExecute("path/to/file.extension");
   */
  public canExecute(filePath: string) {
    try {
      fs.accessSync(filePath, fs.constants.X_OK);
      return true;
    }
    catch (error) {
      return false;
    }
  }

  /**
   * @description Check if a file exists.
   *
   * @param filePath Path to the file.
   * @returns Whether the file exists.
   *
   * ---
   * @example
   * const exists = Actionify.filesystem.exists("path/to/file.extension");
   */
  public exists(filePath: string) {
    try {
      fs.accessSync(filePath);
      return true;
    }
    catch (error) {
      return false;
    }
  }

  /**
   * @description Read the whole content of a readable file and return it.
   * If the file is too large, use `readStream` instead.
   *
   * @param filePath Path to a readable file.
   * @returns The content of the file.
   *
   * ---
   * @example
   * const content = Actionify.filesystem.read("path/to/file.extension");
   */
  public read(filePath: string) {
    return fs.readFileSync(filePath, { encoding: "utf-8" });
  }

  /**
   * @description Read a readable file chunk by chunk and return a {@link https://nodejs.org/api/stream.html#readable-streams ReadableStream}.
   *
   * @param filePath Path to a readable file.
   * @returns A {@link https://nodejs.org/api/stream.html#readable-streams ReadableStream} to the file.
   *
   * ---
   * @example
   * const readStream = Actionify.filesystem.readStream("path/to/file.extension");
   * readStream.on("data", (chunk) => console.log(chunk));
   */
  public readStream(filePath: string) {
    return fs.createReadStream(filePath, { encoding: "utf-8" });
  }

  /**
   * @description Write the given content to a writable file. Please note:
   * - If the file already contains content, it will be overwritten.
   * Otherwise, use `append` instead.
   * - If the file is too large, use `writeStream` instead.
   * - If `content` is too large, use `writeStream` instead.
   *
   * @param filePath Path to a writable file.
   * @param content Content to write to the file.
   *
   * ---
   * @example
   * Actionify.filesystem.write("path/to/file.extension", "Hello, world!");
   */
  public write(filePath: string, content: string) {
    fs.writeFileSync(filePath, content, { encoding: "utf-8" });
  }

  /**
   * @description Create a {@link https://nodejs.org/api/stream.html#writable-streams WritableStream} to a writable file.
   *
   * @param filePath Path to a writable file.
   * @returns A {@link https://nodejs.org/api/stream.html#writable-streams WritableStream} to the file.
   *
   * ---
   * @example
   * const writeStream = Actionify.filesystem.writeStream("path/to/file.extension");
   * writeStream.write("Hello, world!");
   * writeStream.end();
   */
  public writeStream(filePath: string) {
    const absoluteFilePath = path.resolve(filePath);
    if (FilesystemController.#fileWriters.has(absoluteFilePath)) {
      return FilesystemController.#fileWriters.get(absoluteFilePath)!;
    }
    const writeStream = fs.createWriteStream(absoluteFilePath, { encoding: "utf-8" });
    FilesystemController.#fileWriters.set(absoluteFilePath, writeStream);
    writeStream.on("close", () => {
      FilesystemController.#fileWriters.delete(absoluteFilePath);
    });
    return writeStream;
  }

  /**
   * @description Append the given content to a writable file.
   *
   * @param filePath Path to a writable file.
   * @param content Content to append to the file.
   *
   * ---
   * @example
   * Actionify.filesystem.append("path/to/file.extension", "Hello, world!");
   */
  public append(filePath: string, content: string) {
    fs.appendFileSync(filePath, content, { encoding: "utf-8" });
  }

  /**
   * @description Create a file or directory.
   *
   * @param filePath Path to a file or directory.
   * @param isDirectory Whether the file is a directory.
   *
   * ---
   * @example
   * // Create a file
   * Actionify.filesystem.create("/path/to/file.extension");
   *
   * // Create a directory
   * Actionify.filesystem.create("/path/to/directory", true);
   */
  public create(filePath: string, isDirectory: boolean = false) {
    if (isDirectory) {
      fs.mkdirSync(filePath);
      return;
    }
    this.write(filePath, "");
  }

  /**
   * @description Remove a file or directory.
   *
   * @param filePath Path to a file or directory.
   *
   * ---
   * @example
   * // Remove a file
   * Actionify.filesystem.remove("/path/to/file.extension");
   *
   * // Remove a directory
   * Actionify.filesystem.remove("/path/to/directory");
   */
  public remove(filePath: string) {
    fs.rmSync(filePath);
  }

  /**
   * @description Customize the default inspect output (with `console.log`) of a
   * class instance.
   */
  public [Symbol.for('nodejs.util.inspect.custom')](depth: number, inspectOptions: object, inspect: Function) {
    return Inspectable.format(this, depth, inspectOptions, inspect);
  }

}
