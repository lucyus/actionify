/**
 * @description Controller for input listener state management.
 */
export type InputListenerController = {
  /**
   * @description Pause the active input listener.
   *
   * @returns The input listener controller.
   *
   * ---
   * @example
   * // Listen to all keyboard and mouse events
   * const inputListenerController = input.events
   *   .all((inputEvent, listenerController) => console.log(inputEvent));
   * // Pause the input listener
   * inputListenerController.pause();
   *
   * // Listen to all keyboard "A" key and mouse "left" button events
   * const inputListenerController = input.events
   *   .on("a", "left")
   *   .listen((inputEvent, listenerController) => console.log(inputEvent));
   * // Pause the input listener
   * inputListenerController.pause();
   */
  pause: () => InputListenerController;
  /**
   * @description Resume the paused input listener.
   *
   * @returns The input listener controller.
   *
   * ---
   * @example
   * // Listen to all keyboard and mouse events
   * const inputListenerController = input.events
   *   .all((inputEvent, listenerController) => console.log(inputEvent));
   * // Pause the input listener
   * inputListenerController.pause();
   * // Resume the input listener
   * inputListenerController.resume();
   *
   * // Listen to all keyboard "A" key and mouse "left" button events
   * const inputListenerController = input.events
   *   .on("a", "left")
   *   .listen((inputEvent, listenerController) => console.log(inputEvent));
   * // Pause the input listener
   * inputListenerController.pause();
   * // Resume the input listener
   * inputListenerController.resume();
   */
  resume: () => InputListenerController;
  /**
   * @description Stop and detach the input listener.
   *
   * @returns The input listener controller.
   *
   * ---
   * @example
   * // Listen to all keyboard and mouse events
   * const inputListenerController = input.events
   *   .all((inputEvent, listenerController) => console.log(inputEvent));
   * // Stop and detach the input listener
   * inputListenerController.off();
   *
   * // Listen to all keyboard "A" key and mouse "left" button events
   * const inputListenerController = input.events
   *   .on("a", "left")
   *   .listen((inputEvent, listenerController) => console.log(inputEvent));
   * // Stop and detach the input listener
   * inputListenerController.off();
   */
  off: () => void;
};
