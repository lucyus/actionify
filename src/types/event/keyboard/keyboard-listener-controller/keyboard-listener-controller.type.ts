/**
 * @description Controller for keyboard listener state management.
 */
export type KeyboardListenerController = {
  /**
   *
   * @returns The keyboard listener controller.
   *
   * ---
   * @example
   * // Listen to all keyboard "A" and "B" key events
   * const keyboardListenerController = keyboard.events
   *   .on("a", "b")
   *   .listen((keyboardEvent, listenerController) => console.log(keyboardEvent));
   * // Pause the keyboard listener
   * keyboardListenerController.pause();
   *
   * // Listen to all keyboard "A" key down events
   * const keyboardListenerController = keyboard.events
   *   .on("a down")
   *   .listen((keyboardEvent, listenerController) => console.log(keyboardEvent));
   * // Pause the keyboard listener
   * keyboardListenerController.pause();
   */
  pause: () => KeyboardListenerController;
  /**
   * @description Resume the paused keyboard listener.
   *
   * @returns The keyboard listener controller.
   *
   * ---
   * @example
   * // Listen to all keyboard "A" and "B" key events
   * const keyboardListenerController = keyboard.events
   *   .on("a", "b")
   *   .listen((keyboardEvent, listenerController) => console.log(keyboardEvent));
   * // Pause the keyboard listener
   * keyboardListenerController.pause();
   * // Resume the keyboard listener
   * keyboardListenerController.resume();
   *
   * // Listen to all keyboard "A" key down events
   * const keyboardListenerController = keyboard.events
   *   .on("a down")
   *   .listen((keyboardEvent, listenerController) => console.log(keyboardEvent));
   * // Pause the keyboard listener
   * keyboardListenerController.pause();
   * // Resume the keyboard listener
   * keyboardListenerController.resume();
   */
  resume: () => KeyboardListenerController;
  /**
   * @description Stop and detach the keyboard listener.
   *
   * @returns The keyboard listener controller.
   *
   * ---
   * @example
   * // Listen to all keyboard "A" and "B" key events
   * const keyboardListenerController = keyboard.events
   *   .on("a", "b")
   *   .listen((keyboardEvent, listenerController) => console.log(keyboardEvent));
   * // Stop the keyboard listener
   * keyboardListenerController.off();
   *
   * // Listen to all keyboard "A" key down events
   * const keyboardListenerController = keyboard.events
   *   .on("a down")
   *   .listen((keyboardEvent, listenerController) => console.log(keyboardEvent));
   * // Stop the keyboard listener
   * keyboardListenerController.off();
   */
  off: () => void;
};
