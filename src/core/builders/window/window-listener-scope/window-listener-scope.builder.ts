import {
  WindowInteractionController,
  WindowListenerScopeController,
} from "../../../../core/controllers";
import type {
  WindowEventType,
  WindowInfo,
  WindowListener,
  WindowListenerOptions,
} from "../../../../core/types";
import { Inspectable } from "../../../../core/utilities";

export class WindowListenerScopeBuilder {

  #windowEventTypes: WindowEventType[];
  #windowToTrack?: WindowInteractionController;

  public constructor(
    windowEventTypes: WindowEventType[],
    windowToTrack?: WindowInteractionController,
  ) {
    this.#windowEventTypes = windowEventTypes;
    this.#windowToTrack = windowToTrack;
  }

  /**
   * @description Attach the given window listener and start listening to the given window events.
   *
   * @param windowListener The window listener callback.
   * @param windowListenerOptions The window listener options. See {@link WindowListenerOptions}.
   * @returns The window listener controller.
   *
   * ---
   * @example
   * // Listen to all window focus and minimize events
   * Actionify.window.events.on("focus", "minimize").listen((windowEvent, listenerController) => console.log(windowEvent));
   *
   * // Listen to all file explorer windows focus and minimize events
   * Actionify.window.events.on("focus", "minimize").listen(
   *   (windowEvent, listenerController) => console.log(windowEvent),
   *   { shouldListen: (window) => window.executableFile.includes("explorer.exe") }
   * );
   */
  public listen(windowListener: WindowListener, windowListenerOptions?: WindowListenerOptions) {
    const windowListenerScopeController = new WindowListenerScopeController(
      windowListener,
      this.#windowEventTypes,
      this.#resolveOptions(windowListenerOptions),
    );
    return windowListenerScopeController.listenerController;
  }

  #resolveOptions(windowListenerOptions?: WindowListenerOptions): WindowListenerOptions {
    const safeWindowListenerOptions = windowListenerOptions || {};
    const trackedWindow = this.#windowToTrack;
    if (trackedWindow) {
      const trackedWindowFilter = (eventWindow: WindowInfo) => eventWindow.id === trackedWindow.id;
      if (!safeWindowListenerOptions.shouldListen) {
        safeWindowListenerOptions.shouldListen = trackedWindowFilter;
      }
      else {
        const userWindowFilter = safeWindowListenerOptions.shouldListen;
        safeWindowListenerOptions.shouldListen = (eventWindow: WindowInfo) => {
          try {
            return userWindowFilter(eventWindow) &&
              trackedWindowFilter(eventWindow)
            ;
          }
          catch (error) {
            console.error(error);
            // Consider invalid filters as undefined, so they are not applied
            return true;
          }
        }
      }
    }
    return safeWindowListenerOptions;
  }

  /**
   * @description Customize the default inspect output (with `console.log`) of a
   * class instance.
   */
  public [Symbol.for('nodejs.util.inspect.custom')](depth: number, inspectOptions: object, inspect: Function) {
    return Inspectable.format(this, depth, inspectOptions, inspect);
  }

}
