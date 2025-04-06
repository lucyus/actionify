import { MouseListenerController } from "../../../../core/controllers";

export interface IMouseListenerController {

  /**
   * @description Pause the given active mouse listener.
   *
   * @param listener The mouse listener to pause.
   *
   * ---
   * @example
   * // Listen to all mouse left and right button events
   * const mouseListenerController = Actionify.mouse.events
   *   .on("left", "right")
   *   .listen((mouseEvent, listenerController) => console.log(mouseEvent));
   * // Pause the mouse listener
   * mouseListenerController.pause();
   */
  pause(): MouseListenerController;

  /**
   * @description Resume the given paused mouse listener.
   *
   * @param listener The mouse listener to resume.
   *
   * ---
   * @example
   * // Listen to all mouse left and right button events
   * const mouseListenerController = Actionify.mouse.events
   *   .on("left", "right")
   *   .listen((mouseEvent, listenerController) => console.log(mouseEvent));
   * // Pause the mouse listener
   * mouseListenerController.pause();
   * // Resume the mouse listener
   * mouseListenerController.resume();
   */
  resume(): MouseListenerController;

  /**
   * @description Stop and detach the given mouse listener.
   *
   * @param listener The mouse listener to stop and detach.
   *
   * ---
   * @example
   * // Listen to all mouse left and right button events
   * const mouseListenerController = Actionify.mouse.events
   *   .on("left", "right")
   *   .listen((mouseEvent, listenerController) => console.log(mouseEvent));
   * // Stop and detach the mouse listener
   * mouseListenerController.off();
   */
  off(): void;

}
