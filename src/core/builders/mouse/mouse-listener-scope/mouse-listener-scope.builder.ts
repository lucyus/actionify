import { MouseListenerScopeController } from "../../../../core/controllers";
import type {
  MouseAction,
  MouseListener,
  MouseListenerOptions,
} from "../../../../core/types";
import { Inspectable } from "../../../../core/utilities";

export class MouseListenerScopeBuilder {

  #mouseActions: MouseAction[];

  public constructor(
    mouseActions: MouseAction[],
  ) {
    this.#mouseActions = mouseActions;
  }

  /**
   * @description Attach the given mouse listener and start listening to the given mouse events.
   *
   * @param mouseListener The mouse listener callback.
   * @param mouseListenerOptions The mouse listener options. See {@link MouseListenerOptions}.
   * @returns The mouse listener controller.
   *
   * ---
   * @example
   * // Start listening to all mouse left and right button events
   * Actionify.mouse.events.on("left", "right").listen((mouseEvent, listenerController) => console.log(mouseEvent));
   * // Start listening to all hardware/driver only mouse left and right button events
   * Actionify.mouse.events.on("left", "right").listen(
   *   (mouseEvent, listenerController) => console.log(mouseEvent),
   *   { ignoreInjected: true }
   * );
   *
   * // Start listening to all mouse left button press events
   * Actionify.mouse.events.on("left down").listen((mouseEvent, listenerController) => console.log(mouseEvent));
   * // Start listening to all hardware/driver only mouse left button press events
   * Actionify.mouse.events.on("left down").listen(
   *   (mouseEvent, listenerController) => console.log(mouseEvent),
   *   { ignoreInjected: true }
   * );
   *
   * // Start listening to all mouse movement events
   * Actionify.mouse.events.on("move").listen((mouseEvent, listenerController) => console.log(mouseEvent));
   * // Start listening to all hardware/driver only mouse movement events
   * Actionify.mouse.events.on("move").listen(
   *   (mouseEvent, listenerController) => console.log(mouseEvent),
   *   { ignoreInjected: true }
   * );
   */
  public listen(mouseListener: MouseListener, mouseListenerOptions?: MouseListenerOptions) {
    const mouseListenerScopeController = new MouseListenerScopeController(mouseListener, this.#mouseActions, mouseListenerOptions);
    return mouseListenerScopeController.listenerController;
  }

  /**
   * @description Customize the default inspect output (with `console.log`) of a
   * class instance.
   */
  public [Symbol.for('nodejs.util.inspect.custom')](depth: number, inspectOptions: object, inspect: Function) {
    return Inspectable.format(this, depth, inspectOptions, inspect);
  }

}
