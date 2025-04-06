import { InputListenerController } from "../../../../core/controllers";

export interface IInputListenerController {

  /**
   * @description Pause the given active input listener.
   *
   * ---
   * @example
   * // Listen to all keyboard and mouse events
   * const inputListenerController = Actionify.input.events
   *   .all((inputEvent, listenerController) => console.log(inputEvent));
   * // Pause the input listener
   * inputListenerController.pause();
   */
  pause(): InputListenerController;

  /**
   * @description Resume the given paused input listener.
   *
   * ---
   * @example
   * // Listen to all keyboard and mouse events
   * const inputListenerController = Actionify.input.events
   *   .all((inputEvent, listenerController) => console.log(inputEvent));
   * // Pause the input listener
   * inputListenerController.pause();
   * // Resume the input listener
   * inputListenerController.resume();
   */
  resume(): InputListenerController;

  /**
   * @description Stop and detach the given input listener.
   *
   * @param listener The input listener to stop and detach.
   *
   * ---
   * @example
   * // Listen to all keyboard and mouse events
   * const inputListenerController = Actionify.input.events
   *   .all((inputEvent, listenerController) => console.log(inputEvent));
   * // Stop and detach the input listener
   * inputListenerController.off();
   */
  off(): void;

}
