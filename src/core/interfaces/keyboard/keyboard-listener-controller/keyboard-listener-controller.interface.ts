import { KeyboardListenerController } from "../../../../core/controllers";

export interface IKeyboardListenerController {

  /**
   * @description Pause the given keyboard listener.
   *
   * @param listener The keyboard listener to pause.
   *
   * ---
   * @example
   * // Listen to all keyboard "A" and "B" key events
   * const keyboardListenerController = Actionify.keyboard.events
   *   .on("a", "b")
   *   .listen((keyboardEvent, listenerController) => console.log(keyboardEvent));
   * // Pause the keyboard listener
   * keyboardListenerController.pause();
   */
  pause(): KeyboardListenerController;

  /**
   * @description Resume the given paused keyboard listener.
   *
   * @param listener The keyboard listener to resume.
   *
   * ---
   * @example
   * // Listen to all keyboard "A" and "B" key events
   * const keyboardListenerController = Actionify.keyboard.events
   *   .on("a", "b")
   *   .listen((keyboardEvent, listenerController) => console.log(keyboardEvent));
   * // Pause the keyboard listener
   * keyboardListenerController.pause(keyboardListener);
   * // Resume the keyboard listener
   * keyboardListenerController.resume(keyboardListener);
   */
  resume(): KeyboardListenerController;

  /**
   * @description Stop and detach the given keyboard listener.
   *
   * @param listener The keyboard listener to stop and detach.
   *
   * ---
   * @example
   * // Listen to all keyboard "A" and "B" key events
   * const keyboardListenerController = Actionify.keyboard.events
   *   .on("a", "b")
   *   .listen((keyboardEvent, listenerController) => console.log(keyboardEvent));
   * // Stop and detach the keyboard listener
   * keyboardListenerController.off(keyboardListener);
   */
  off(): void;

}
