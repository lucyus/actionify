import { WindowListenerController } from "../../../../core/controllers";

export interface IWindowListenerController {

  /**
   * @description Pause the given active window listener.
   *
   * ---
   * @example
   * // Listen to all window focus and minimize events
   * const windowListenerController = Actionify.window.events
   *   .on("focus", "minimize")
   *   .listen((windowEvent, listenerController) => console.log(windowEvent));
   * // Pause the window listener
   * windowListenerController.pause();
   */
  pause(): WindowListenerController;

  /**
   * @description Resume the given paused window listener.
   *
   * ---
   * @example
   * // Listen to all window focus and minimize events
   * const windowListenerController = Actionify.window.events
   *   .on("focus", "minimize")
   *   .listen((windowEvent, listenerController) => console.log(windowEvent));
   * // Pause the window listener
   * windowListenerController.pause();
   * // Resume the window listener
   * windowListenerController.resume();
   */
  resume(): WindowListenerController;

  /**
   * @description Stop and detach the given window listener.
   *
   * ---
   * @example
   * // Listen to all window focus and minimize events
   * const windowListenerController = Actionify.window.events
   *   .on("focus", "minimize")
   *   .listen((windowEvent, listenerController) => console.log(windowEvent));
   * // Stop and detach the window listener
   * windowListenerController.off();
   */
  off(): void;

}
