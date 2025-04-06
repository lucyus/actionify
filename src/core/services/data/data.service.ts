import { Inspectable } from "../../../core/utilities";

export class DataService {

  static readonly #weakMap: WeakMap<WeakKey, any> = new WeakMap();

  public static get<T extends WeakKey, U = any>(key: T): U {
    return DataService.#weakMap.get(key);
  }

  public static set<T extends WeakKey, U = any>(key: T, value: U): void {
    DataService.#weakMap.set(key, value);
  }

  /**
   * @description Customize the default inspect output (with `console.log`) of a
   * class instance.
   */
  public [Symbol.for('nodejs.util.inspect.custom')](depth: number, inspectOptions: object, inspect: Function) {
    return Inspectable.format(this, depth, inspectOptions, inspect);
  }

}
