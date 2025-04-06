import { InspectOptions } from "util";

export class Inspectable {

  protected constructor() { }

  /**
   * @description Format an object to be inspectable with `console.log`.
   */
  public static format<T extends object = object>(value: T, depth: number, inspectOptions: InspectOptions, inspect: Function) {
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const prototypeDescriptors = Object.getOwnPropertyDescriptors(Object.getPrototypeOf(value));

    const result: Record<string, any> = { };

    // Include normal properties and getter values
    for (const [key, descriptor] of Object.entries({ ...descriptors, ...prototypeDescriptors })) {
      if (typeof descriptor.get === "function") {
        // Call getter to include its value
        try {
          result[key] = (value as any)[key];
        } catch (error) {
          result[key] = "[Getter Error]";
        }
      } else if (typeof descriptor.value !== "function") {
        // Normal properties
        result[key] = descriptor.value;
      }
    }

    // Include methods
    for (const key of Object.getOwnPropertyNames(Object.getPrototypeOf(value))) {
      if (key !== "constructor" && typeof (value as any)[key] === "function") {
        result[key] = (value as any)[key];
      }
    }

    return `${value.constructor.name} ${inspect(result, inspectOptions)}`;
  }

  /**
   * @description Customize the default inspect output (with `console.log`) of a
   * class instance.
   */
  public [Symbol.for('nodejs.util.inspect.custom')](depth: number, inspectOptions: InspectOptions, inspect: Function) {
    return Inspectable.format(this, depth, inspectOptions, inspect);
  }

}
