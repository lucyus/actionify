import {
  sleep,
} from "../../../addon";
import { Inspectable } from "../../../core/utilities";

/**
 * @description Common time management operations.
 */
export class TimeController {

  public constructor() { }

  /**
   * @description Returns the stored time value in milliseconds since midnight, January 1, 1970 UTC.
   *
   * @returns The stored time value in milliseconds since midnight, January 1, 1970 UTC.
   *
   * ---
   * @example
   * const now = Actionify.time.now();
   */
  public now(): number {
    return (new Date()).getTime();
  }

  /**
   * @description Put the current thread to sleep for the specified number of milliseconds.
   *
   * @param milliseconds  The number of milliseconds to sleep.
   * @returns Synchronously after the specified number of milliseconds.
   *
   * ---
   * @example
   * Actionify.time.waitSync(1000);
   */
  public waitSync(milliseconds?: number) {
    if (milliseconds && milliseconds > 0) {
      return sleep(milliseconds);
    }
  }

  /**
   * @description Asynchronous sleep for the specified number of milliseconds.
   *
   * @param milliseconds The number of milliseconds to sleep.
   * @param callback The callback function to execute after the specified number of milliseconds.
   * @returns A promise that resolves after the specified number of milliseconds and the callback execution.
   *
   * ---
   * @example
   * // Wait asynchronously for 1 second
   * await Actionify.time.waitAsync(1000);
   *
   * // Wait asynchronously for 1 second and execute a callback function
   * await Actionify.time.waitAsync(1000, () => console.log("At least 1 second has passed."));
   */
  public async waitAsync<T = void>(milliseconds?: number, callback: () => T | Promise<T> = () => undefined as T): Promise<T> {
    if (milliseconds && milliseconds > 0) {
      return new Promise<T>((resolve, reject) => {
        setTimeout(async () => {
          try {
            const result = await callback();
            resolve(result);
          }
          catch (error) {
            reject(error);
          }
        }, milliseconds);
      });
    }
    return callback();
  }

  /**
   * @description Customize the default inspect output (with `console.log`) of a
   * class instance.
   */
  public [Symbol.for('nodejs.util.inspect.custom')](depth: number, inspectOptions: object, inspect: Function) {
    return Inspectable.format(this, depth, inspectOptions, inspect);
  }

}
