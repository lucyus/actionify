import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import {
  cleanResources,
} from "../../../addon";
import type { RestartOptions } from "../../../core/types";
import { Inspectable } from "../../../core/utilities";

export class LifecycleController {

  static #hasCleanHandlers: boolean = false;

  public constructor() { }

  static #onUnexpectedExit(): void {
    cleanResources();
    setImmediate(() => { process.exit(); } );
  }

  /**
   * @description Clean up C++ resources when the process is about to exit.
   *
   * ---
   * @example
   * LifecycleController.cleanBeforeExit();
   */
  public static cleanBeforeExit(): void {
    if (LifecycleController.#hasCleanHandlers) return;
    process.on('SIGINT', LifecycleController.#onUnexpectedExit);
    process.on('SIGTERM', LifecycleController.#onUnexpectedExit);
    process.on('exit', () => { cleanResources(); });
    LifecycleController.#hasCleanHandlers = true;
  }

  /**
   * @description Exit the process with the specified exit code.
   *
   * @param exitCode The exit code to exit with.
   *
   * ---
   * @example
   * // Exit the process with success code 0
   * Actionify.exit();
   *
   * // Exit the process with error code 1
   * Actionify.exit(1);
   */
  public exit(exitCode: number = 0) {
    process.exit(exitCode);
  }

  /**
   * @description Restart the process in a new detached process.
   * Standard streams are ignored unless redirected to files with `options.stdio`.
   *
   * @param options Restart options (see {@link RestartOptions}).
   *
   * ---
   * @example
   * // Restart the process
   * Actionify.restart();
   *
   * // Restart the process and keep its logs in files
   * Actionify.restart({ stdio: { out: "out.log", err: "err.log" } });
   */
  public restart(options?: RestartOptions) {
    const openedDescriptors: number[] = [];
    try {
      const stdio = (["in", "out", "err"] as const).map((inOrOutOrErr) => {
        const filePath = options?.stdio?.[inOrOutOrErr];
        if (filePath === undefined) return "ignore";
        const absoluteFilePath = path.resolve(filePath);
        if (inOrOutOrErr !== "in") fs.mkdirSync(path.dirname(absoluteFilePath), { recursive: true });
        const descriptor = fs.openSync(absoluteFilePath, inOrOutOrErr === "in" ? "r" : "a");
        openedDescriptors.push(descriptor);
        return descriptor;
      });
      const child = spawn(process.argv[0], process.argv.slice(1), { stdio, detached: true });
      child.unref();
    }
    finally {
      openedDescriptors.forEach((descriptor) => fs.closeSync(descriptor));
    }
    process.exit(0);
  }

  /**
   * @description Execute the given function a specified number of times.
   *
   * @param callback The callback function to execute.
   * @param iterationsOrPredicate The number of times to execute the callback or a predicate function that returns `false` to stop, `true` otherwise. If unset, the callback will be executed indefinitely.
   * @returns A promise that resolves when the callback has been executed until the end of the loop, rejects otherwise.
   *
   * ---
   * @example
   * // Execute a function indefinitely
   * await Actionify.loop((index) => {
   *   console.log("Hello world!");
   * });
   *
   * // Execute a function 10 times
   * await Actionify.loop((index) => {
   *   console.log(`Hello ${index + 1} times!`);
   * }, 10);
   *
   * // Execute a function until a custom condition is met
   * await Actionify.loop((index) => {
   *   console.log("Hello, you had 90% chance to see this!");
   * }, (index) => Math.random() < 0.9);
   */
  public async loop(
    callback: (index: number) => Promise<void> | void,
    iterationsOrPredicate: number | ((index: number) => boolean | Promise<boolean>) = (() => true)
  ) {
    const continuePredicate = typeof iterationsOrPredicate === "number" ? ((index: number) => index < iterationsOrPredicate) : iterationsOrPredicate;
    return new Promise<void>((resolve, reject) => {
      const next = async (iteration: number) => {
        try {
          const shouldContinue = await continuePredicate(iteration);
          if (shouldContinue) {
            await callback(iteration);
            // setImmediate is much faster but can impact system performance
            setTimeout(next.bind(null, iteration + 1), 0);
          }
          else {
            resolve();
          }
        }
        catch (error) {
          reject(error);
        }
      };
      next(0);
    });
  }

  /**
   * @description Customize the default inspect output (with `console.log`) of a
   * class instance.
   */
  public [Symbol.for('nodejs.util.inspect.custom')](depth: number, inspectOptions: object, inspect: Function) {
    return Inspectable.format(this, depth, inspectOptions, inspect);
  }

}
