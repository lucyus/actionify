import { KeyboardListenerScopeController } from "../../../../core/controllers";
import type {
  KeyAction,
  KeyboardListener,
  KeyboardListenerOptions,
} from "../../../../core/types";
import { Inspectable } from "../../../../core/utilities";

export class KeyboardListenerScopeBuilder {

  #keyboardActions: KeyAction[];

  public constructor(
    keyboardActions: KeyAction[]
  ) {
    this.#keyboardActions = keyboardActions;
  }

  /**
   * @description Attach the given keyboard listener and start listening to the given keyboard events.
   *
   * @param keyboardListener The keyboard listener callback.
   * @param KeyboardListenerOptions The keyboard listener options. See {@link KeyboardListenerOptions}.
   * @returns The keyboard listener controller.
   *
   * ---
   * @example
   * // Listen to all keyboard "A" and "B" key events
   * Actionify.keyboard.events.on("a", "b").listen((keyboardEvent, listenerController) => console.log(keyboardEvent));
   * // Listen to all hardware/driver only keyboard "A" and "B" key events
   * Actionify.keyboard.events.on("a", "b").listen(
   *   (keyboardEvent, listenerController) => console.log(keyboardEvent),
   *   { ignoreInjected: true }
   * );
   *
   * // Listen to all keyboard "A" key down events
   * Actionify.keyboard.events.on("a down").listen((keyboardEvent, listenerController) => console.log(keyboardEvent));
   * // Listen to all hardware/driver only keyboard "A" key down events
   * Actionify.keyboard.events.on("a down").listen(
   *   (keyboardEvent, listenerController) => console.log(keyboardEvent),
   *   { ignoreInjected: true }
   * );
   */
  public listen(keyboardListener: KeyboardListener, keyboardListenerOptions?: KeyboardListenerOptions) {
    const keyboardListenerScopeController = new KeyboardListenerScopeController(
      keyboardListener,
      this.#keyboardActions,
      keyboardListenerOptions,
    );
    return keyboardListenerScopeController.listenerController;
  }

  /**
   * @description Customize the default inspect output (with `console.log`) of a
   * class instance.
   */
  public [Symbol.for('nodejs.util.inspect.custom')](depth: number, inspectOptions: object, inspect: Function) {
    return Inspectable.format(this, depth, inspectOptions, inspect);
  }

}
