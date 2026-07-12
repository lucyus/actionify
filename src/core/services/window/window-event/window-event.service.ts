import { Actionify } from "../../../../core";
import { WindowInteractionController, WindowListenerScopeController } from "../../../../core/controllers";
import type {
  RawWindowEvent,
  WindowEvent,
  WindowInfo,
} from "../../../../core/types";
import { Inspectable } from "../../../../core/utilities";

/**
 * @description Manage declared window listeners.
 */
export class WindowEventService {

  static #windowListeners: Array<WindowListenerScopeController> = [];
  static #windowsHistory: Map<number, WindowInfo> = new Map();

  protected constructor() { }

  /**
   * @description Handle window events and run declared listeners accordingly.
   * @param currentEvent Raw window event
   */
  static #mainWindowEventListener(currentRawWindowEvent: RawWindowEvent): void {
    switch (currentRawWindowEvent.type) {
      case "destroy": {
        // initialize list of runners
        const windowListenersToRun: WindowListenerScopeController[] = [];
        // Get window info from history as the window no longer exists
        const previousWindowState = WindowEventService.#windowsHistory.get(currentRawWindowEvent.id);
        if (!previousWindowState) {
          // Should happen only for windows we are not interested in
          // (e.g. the ones that won't show in ALT + TAB)
          return;
        }
        // Remove window from history
        WindowEventService.#windowsHistory.delete(previousWindowState.id);
        // Create window event
        const currentWindowEvent: WindowEvent = {
          type: "destroy",
          window: previousWindowState,
        };
        // Find window listeners that are listening to the current window event
        const eligibleWindowListeners = WindowEventService.windowListeners.filter((windowListener) =>
          !windowListener.isPaused &&
          (!windowListener.shouldListen || windowListener.shouldListen(currentWindowEvent.window))
        );
        for (const windowListener of eligibleWindowListeners) {
          const isListeningToCurrentWindowEvent = windowListener.when.length === 0 || windowListener.when.find((windowEventType) => windowEventType === currentWindowEvent.type) !== undefined;
          if (isListeningToCurrentWindowEvent) {
            windowListenersToRun.push(windowListener);
          }
        }
        // Run eligible window listeners
        for (const windowListener of windowListenersToRun) {
          windowListener.currentRunners++;
          const result = windowListener.listener(currentWindowEvent, windowListener.listenerController);
          if (result instanceof Promise) {
            result
              .catch((error) => { console.error(error); })
              .finally(() => { windowListener.currentRunners--; })
            ;
          }
          else {
            windowListener.currentRunners--;
          }
        }
        break;
      }
      case "focus": {
        // initialize list of runners
        const windowListenersToRun: WindowListenerScopeController[] = [];
        // Get window linked to the event
        const targetWindow = Actionify.window.get(currentRawWindowEvent.id);
        if (!targetWindow) {
          // Should never happen as C++ hook filters events
          return;
        }
        // Generate a blur event if the focused window differs from the previous one(s)
        const currentFocusedWindow = targetWindow;
        for (const previousStateWindow of WindowEventService.#windowsHistory.values()) {
          if (
            previousStateWindow.isFocused &&
            previousStateWindow.id !== currentFocusedWindow.id
          ) {
            const blurRawWindowEvent: RawWindowEvent = {
              id: previousStateWindow.id,
              type: "blur",
            };
            WindowEventService.#mainWindowEventListener(blurRawWindowEvent);
          }
        }
        // Generate a restore or maximize event if the focused window was minimized
        const previousStateWindow = WindowEventService.#windowsHistory.get(currentFocusedWindow.id);
        if (
          previousStateWindow &&
          previousStateWindow.isMinimized &&
          !currentFocusedWindow.isMinimized
        ) {
          if (currentFocusedWindow.isMaximized) {
            WindowEventService.#mainWindowEventListener({
              id: currentFocusedWindow.id,
              type: "maximize",
            });
          }
          else if (currentFocusedWindow.isRestored) {
            WindowEventService.#mainWindowEventListener({
              id: currentFocusedWindow.id,
              type: "restore",
            });
          }
          else {
            // Should never happen because minimize, restore and maximize are mutually exclusive
          }
        }
        // Update current window history
        WindowEventService.#setWindowHistory(currentFocusedWindow);
        // Create window event
        const currentWindowEvent: WindowEvent = {
          type: "focus",
          window: targetWindow,
        };
        // Find window listeners that are listening to the current window event
        const eligibleWindowListeners = WindowEventService.windowListeners.filter((windowListener) =>
          !windowListener.isPaused &&
          (!windowListener.shouldListen || windowListener.shouldListen(currentWindowEvent.window))
        );
        for (const windowListener of eligibleWindowListeners) {
          const isListeningToCurrentWindowEvent = windowListener.when.length === 0 || windowListener.when.find((windowEventType) => windowEventType === currentWindowEvent.type) !== undefined;
          if (isListeningToCurrentWindowEvent) {
            windowListenersToRun.push(windowListener);
          }
        }
        // Run eligible window listeners
        for (const windowListener of windowListenersToRun) {
          windowListener.currentRunners++;
          const result = windowListener.listener(currentWindowEvent, windowListener.listenerController);
          if (result instanceof Promise) {
            result
              .catch((error) => { console.error(error); })
              .finally(() => { windowListener.currentRunners--; })
            ;
          }
          else {
            windowListener.currentRunners--;
          }
        }
        break;
      }
      case "locationchange": {
        // Get window linked to the event
        const targetWindow = Actionify.window.get(currentRawWindowEvent.id);
        if (!targetWindow) {
          // Should never happen as C++ hook filters events
          return;
        }
        // Get previous window state
        const previousWindowState = WindowEventService.#windowsHistory.get(targetWindow.id);
        if (!previousWindowState) {
          // Should never happen as C++ hook filters events
          return;
        }
        // Deduce and generate underlying window event
        if (!previousWindowState.isMaximized && targetWindow.isMaximized) {
          const currentWindowEvent: RawWindowEvent = {
            type: "maximize",
            id: targetWindow.id,
          };
          return WindowEventService.#mainWindowEventListener(currentWindowEvent);
        }
        if (!previousWindowState.isMinimized && targetWindow.isMinimized) {
          const currentWindowEvent: RawWindowEvent = {
            type: "minimize",
            id: targetWindow.id,
          };
          return WindowEventService.#mainWindowEventListener(currentWindowEvent);
        }
        if (!previousWindowState.isRestored && targetWindow.isRestored) {
          // Only happens when window is maximized and becomes restored
          // When minimized, the OS first triggers "focus" before "locationchange"
          // which is why it will be handled in the "focus" case and not here
          const currentWindowEvent: RawWindowEvent = {
            type: "restore",
            id: targetWindow.id,
          };
          return WindowEventService.#mainWindowEventListener(currentWindowEvent);
        }
        if (
          previousWindowState.dimensions.width !== targetWindow.dimensions.width ||
          previousWindowState.dimensions.height !== targetWindow.dimensions.height
        ) {
          const currentWindowEvent: RawWindowEvent = {
            type: "resize",
            id: targetWindow.id,
          };
          WindowEventService.#mainWindowEventListener(currentWindowEvent);
        }
        if (
          previousWindowState.position.x !== targetWindow.position.x ||
          previousWindowState.position.y !== targetWindow.position.y
        ) {
          const currentWindowEvent: RawWindowEvent = {
            type: "move",
            id: targetWindow.id,
          };
          WindowEventService.#mainWindowEventListener(currentWindowEvent);
        }
        // This section is reachable when a window is restored.
        break;
      }
      case "minimize": {
        // initialize list of runners
        const windowListenersToRun: WindowListenerScopeController[] = [];
        // Get target window
        const targetWindow = Actionify.window.get(currentRawWindowEvent.id);
        if (!targetWindow) {
          // Should never happen as C++ hook filters events
          return;
        }
        // Generate a blur event if window is not focused
        if (!targetWindow.isFocused) {
          WindowEventService.#mainWindowEventListener({
            type: "blur",
            id: targetWindow.id,
          });
        }
        // Update current window history
        WindowEventService.#setWindowHistory(targetWindow);
        // Create window event
        const currentWindowEvent: WindowEvent = {
          type: "minimize",
          window: targetWindow
        }
        // Find window listeners that are listening to the current window event
        const eligibleWindowListeners = WindowEventService.windowListeners.filter((windowListener) =>
          !windowListener.isPaused &&
          (!windowListener.shouldListen || windowListener.shouldListen(currentWindowEvent.window))
        );
        for (const windowListener of eligibleWindowListeners) {
          const isListeningToCurrentWindowEvent = windowListener.when.length === 0 || windowListener.when.find((windowEventType) => windowEventType === currentWindowEvent.type) !== undefined;
          if (isListeningToCurrentWindowEvent) {
            windowListenersToRun.push(windowListener);
          }
        }
        // Run eligible window listeners
        for (const windowListener of windowListenersToRun) {
          windowListener.currentRunners++;
          const result = windowListener.listener(currentWindowEvent, windowListener.listenerController);
          if (result instanceof Promise) {
            result
              .catch((error) => { console.error(error); })
              .finally(() => { windowListener.currentRunners--; })
            ;
          }
          else {
            windowListener.currentRunners--;
          }
        }
        break;
      }
      case "create":
      case "blur":
      case "maximize":
      case "restore":
      case "move":
      case "resize": {
        // initialize list of runners
        const windowListenersToRun: WindowListenerScopeController[] = [];
        // Get target window
        const targetWindow = Actionify.window.get(currentRawWindowEvent.id);
        if (!targetWindow) {
          // Should never happen as C++ hook filters events
          return;
        }
        // Update current window history
        WindowEventService.#setWindowHistory(targetWindow);
        // Create window event
        const currentWindowEvent: WindowEvent = {
          type: currentRawWindowEvent.type,
          window: targetWindow
        }
        // Find window listeners that are listening to the current window event
        const eligibleWindowListeners = WindowEventService.windowListeners.filter((windowListener) =>
          !windowListener.isPaused &&
          (!windowListener.shouldListen || windowListener.shouldListen(currentWindowEvent.window))
        );
        for (const windowListener of eligibleWindowListeners) {
          const isListeningToCurrentWindowEvent = windowListener.when.length === 0 || windowListener.when.find((windowEventType) => windowEventType === currentWindowEvent.type) !== undefined;
          if (isListeningToCurrentWindowEvent) {
            windowListenersToRun.push(windowListener);
          }
        }
        // Run eligible window listeners
        for (const windowListener of windowListenersToRun) {
          windowListener.currentRunners++;
          const result = windowListener.listener(currentWindowEvent, windowListener.listenerController);
          if (result instanceof Promise) {
            result
              .catch((error) => { console.error(error); })
              .finally(() => { windowListener.currentRunners--; })
            ;
          }
          else {
            windowListener.currentRunners--;
          }
        }
        break;
      }
    }
  }

  public static get windowListeners(): Array<WindowListenerScopeController> {
    return this.#windowListeners;
  }

  /**
   * @description Determine whether the main window event listener should be started.
   *
   * @returns Whether the main window event listener should be started.
   */
  public static get shouldStartMainWindowEventListener(): boolean {
    return WindowEventService.#windowListeners.length === 1;
  }

  public static get shouldStopMainWindowEventListener(): boolean {
    return WindowEventService.#windowListeners.length === 0;
  }

  static #setWindowHistory(window: WindowInteractionController): void {
    const windowInfo: WindowInfo = {
      id: window.id,
      pid: window.pid,
      title: window.title,
      executableFile: window.executableFile,
      className: window.className,
      position: {
        x: window.position.x,
        y: window.position.y,
      },
      dimensions: {
        width: window.dimensions.width,
        height: window.dimensions.height,
      },
      isMinimized: window.isMinimized,
      isMaximized: window.isMaximized,
      isRestored: window.isRestored,
      isFocused: window.isFocused,
      isAlwaysOnTop: window.isAlwaysOnTop,
    };
    this.#windowsHistory.set(windowInfo.id, windowInfo);
  }

  public static get mainWindowEventListener(): (event: RawWindowEvent) => void {
    return WindowEventService.#mainWindowEventListener;
  }

  public static clearWindowHistory(): void {
    this.#windowsHistory = new Map();
  }

  public static initializeWindowHistory(): void {
    WindowEventService.clearWindowHistory();
    const currentWindows = Actionify.window.list();
    for (const window of currentWindows) {
      WindowEventService.#setWindowHistory(window);
    }
  }

  /**
   * @description Customize the default inspect output (with `console.log`) of a
   * class instance.
   */
  public [Symbol.for('nodejs.util.inspect.custom')](depth: number, inspectOptions: object, inspect: Function) {
    return Inspectable.format(this, depth, inspectOptions, inspect);
  }

}
