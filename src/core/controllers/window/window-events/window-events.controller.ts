import { stopWindowEventListener } from "../../../../addon";
import { WindowListenerScopeBuilder } from "../../../builders";
import { WindowInteractionController } from "../../../../core/controllers";
import { WindowEventService } from "../../../../core/services";
import type {
  WindowEventType,
  WindowInfo,
  WindowListener,
  WindowListenerOptions,
} from "../../../../core/types";
import { Inspectable } from "../../../../core/utilities";

export class WindowEventsController {

  #windowToTrack?: WindowInteractionController;

  public constructor(
    windowToTrack?: WindowInteractionController,
  ) {
    this.#windowToTrack = windowToTrack;
  }

  /**
   * @description Attach the given window listener and start listening to all window events.
   *
   * @param windowListener The window listener callback.
   * @param windowListenerOptions The window listener options. See {@link WindowListenerOptions}.
   * @returns The window listener controller.
   *
   * ---
   * @example
   * // Listen to all window events
   * Actionify.window.events.all((windowEvent, listenerController) => console.log(windowEvent));
   *
   * // Listen to all file explorer windows events
   * Actionify.window.events.all(
   *   (windowEvent, listenerController) => console.log(windowEvent),
   *   { shouldListen: (window) => window.executableFile.includes("explorer.exe") }
   * );
   */
  public all(windowListener: WindowListener, windowListenerOptions?: WindowListenerOptions) {
    return this.on().listen(windowListener, this.#resolveOptions(windowListenerOptions));
  }

  /**
   * @description Listen to the given window events.
   *
   * @param windowEventTypes window event types to listen to.
   * @returns Listener builder.
   *
   * ---
   * @example
   * // Listen to all window "focus" and "minimize" events
   * Actionify.window.events.on("focus", "minimize").listen((windowEvent, listenerController) => console.log(windowEvent));
   *
   * // Listen to all file explorer windows "focus" and "minimize" events
   * Actionify.window.events.on("focus", "minimize").listen(
   *   (windowEvent, listenerController) => console.log(windowEvent),
   *   { shouldListen: (window) => window.executableFile.includes("explorer.exe") }
   * );
   */
  public on(...windowEventTypes: Array<WindowEventType>) {
    return new WindowListenerScopeBuilder(windowEventTypes, this.#windowToTrack);
  }

  /**
   * @description Pause the given active window listener.
   *
   * @param listener The window listener to pause.
   *
   * ---
   * @example
   * // Listen to all window "focus" and "minimize" events
   * const windowListener = (windowEvent, listenerController) => console.log(windowEvent);
   * const windowListenerController = Actionify.window.events
   *   .on("focus", "minimize")
   *   .listen(windowListener);
   * // Pause the window listener
   * Actionify.window.events.pause(windowListener);
   */
  public pause(listener: WindowListener) {
    const listenerScope = WindowEventService.windowListeners.find((windowListener) => windowListener.listener === listener);
    if (listenerScope) {
      listenerScope.isPaused = true;
    }
  }

  /**
   * @description Resume the given paused window listener.
   *
   * @param listener The window listener to resume.
   *
   * ---
   * @example
   * // Listen to all window focus and minimize events
   * const windowListener = (windowEvent, listenerController) => console.log(windowEvent);
   * const windowListenerController = Actionify.window.events
   *   .on("focus", "minimize")
   *   .listen(windowListener);
   * // Pause the window listener
   * Actionify.window.events.pause(windowListener);
   * // Resume the window listener
   * Actionify.window.events.resume(windowListener);
   */
  public resume(listener: WindowListener) {
    const listenerScope = WindowEventService.windowListeners.find((windowListener) => windowListener.listener === listener);
    if (listenerScope) {
      listenerScope.isPaused = false;
    }
  }

  /**
   * @description Stop and detach the given window listener.
   *
   * @param listener The window listener to stop and detach.
   *
   * ---
   * @example
   * // Listen to all focus and minimize events
   * const windowListener = (windowEvent, listenerController) => console.log(windowEvent);
   * const windowListenerController = Actionify.window.events
   *   .on("focus", "minimize")
   *   .listen(windowListener);
   * // Stop and detach the window listener
   * Actionify.window.events.off(windowListener);
   */
  public off(listener: WindowListener) {
    const listenerIndex = WindowEventService.windowListeners.findIndex((windowListener) => windowListener.listener === listener);
    if (listenerIndex !== -1) {
      WindowEventService.windowListeners.splice(listenerIndex, 1);
    }
    if (WindowEventService.shouldStopMainWindowEventListener) {
      stopWindowEventListener();
      WindowEventService.clearWindowHistory();
    }
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
