import { Inspectable } from "../../../../core/utilities";
import type {
  KeyInput,
  KeyboardEvent,
  MouseEvent,
  MouseInput,
} from "../../../../core/types";

/**
 * @description Store latest history of input events.
 */
export class InputStateService {

  static #mouseStateHistory = new Map<MouseInput, MouseEvent>();
  static #keyboardStateHistory = new Map<KeyInput, KeyboardEvent>();

  protected constructor() { }

  public static get mouseStateHistory() {
    return this.#mouseStateHistory;
  }

  public static get keyboardStateHistory() {
    return this.#keyboardStateHistory;
  }

  /**
   * @description Customize the default inspect output (with `console.log`) of a
   * class instance.
   */
  public [Symbol.for('nodejs.util.inspect.custom')](depth: number, inspectOptions: object, inspect: Function) {
    return Inspectable.format(this, depth, inspectOptions, inspect);
  }

}
