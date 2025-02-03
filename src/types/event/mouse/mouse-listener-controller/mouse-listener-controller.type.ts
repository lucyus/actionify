/**
 * @description Controller for mouse listener state management.
 */
export type MouseListenerController = {
  /**
   * @description Pause the active mouse listener.
   *
   * @returns The mouse listener controller.
   *
   * ---
   * @example
   * // Listen to all mouse movement events
   * const mouseListenerController = mouse.events
   *   .on("move")
   *   .listen((mouseEvent, listenerController) => console.log(mouseEvent));
   * // Pause the mouse movement listener
   * mouseListenerController.pause();
   */
  pause: () => MouseListenerController;
  /**
   * @description Resume the paused mouse listener.
   *
   * @returns The mouse listener controller.
   *
   * ---
   * @example
   * // Resume the mouse movement listener
   * const mouseListenerController = mouse.events
   *   .on("move")
   *   .listen((mouseEvent, listenerController) => console.log(mouseEvent));
   * // Pause the mouse movement listener
   * mouseListenerController.pause();
   * // Resume the mouse movement listener
   * mouseListenerController.resume();
   */
  resume: () => MouseListenerController;
  /**
   * @description Stop and detach the mouse listener.
   *
   * @returns The mouse listener controller.
   *
   * ---
   * @example
   * // Stop and detach the mouse movement listener
   * const mouseListenerController = mouse.events
   *   .on("move")
   *   .listen((mouseEvent, listenerController) => console.log(mouseEvent));
   * // Stop and detach the mouse movement listener
   * mouseListenerController.off();
   */
  off: () => void;
};
