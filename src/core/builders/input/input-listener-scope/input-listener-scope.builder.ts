import { InputListenerScopeController } from "../../../../core/controllers";
import type { InputAction, InputListener } from "../../../../core/types";
import { Inspectable } from "../../../../core/utilities";

export class InputListenerScopeBuilder {

  #inputActions: InputAction[];

  public constructor(
    inputActions: InputAction[],
  ) {
    this.#inputActions = inputActions;
  }

  /**
   * @description Attach the given input listener and start listening to the given input events.
   *
   * @param inputListener The input listener callback.
   * @returns The input listener controller.
   *
   * ---
   * @example
   * // Listen to all keyboard and mouse events
   * Actionify.input.events.all((inputEvent, listenerController) => console.log(inputEvent));
   *
   * // Listen to all keyboard "A" key and mouse "left" button events
   * Actionify.input.events.on("a", "left").listen((inputEvent, listenerController) => console.log(inputEvent));
   */
  public listen(inputListener: InputListener) {
    const inputListenerScopeController = new InputListenerScopeController(inputListener, this.#inputActions);
    return inputListenerScopeController.listenerController;
  }

  /**
   * @description Customize the default inspect output (with `console.log`) of a
   * class instance.
   */
  public [Symbol.for('nodejs.util.inspect.custom')](depth: number, inspectOptions: object, inspect: Function) {
    return Inspectable.format(this, depth, inspectOptions, inspect);
  }

}
