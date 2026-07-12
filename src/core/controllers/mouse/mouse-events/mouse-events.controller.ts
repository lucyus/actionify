import {
  startInputEventListener,
  stopInputEventListener,
  suppressInputEvents,
  unsuppressInputEvents,
} from "../../../../addon";
import { MouseListenerScopeBuilder } from "../../../../core/builders";
import { LifecycleController } from "../../../../core/controllers";
import { InputEventService, OperatingSystemService } from "../../../../core/services";
import type {
  MouseAction,
  MouseInput,
  MouseListener,
  MouseListenerOptions,
  MouseState,
} from "../../../../core/types";
import { Inspectable } from "../../../../core/utilities";

export class MouseEventsController {

  public constructor() { }

  /**
   * @description Attach the given mouse listener and start listening to all mouse events.
   *
   * @param mouseListener The mouse listener callback.
   * @param mouseListenerOptions The mouse listener options. See {@link MouseListenerOptions}.
   * @returns The mouse listener controller.
   *
   * ---
   * @example
   * // Listen to all mouse events
   * Actionify.mouse.events.all((mouseEvent, listenerController) => console.log(mouseEvent));
   *
   * // Listen to all hardware/driver only mouse events
   * Actionify.mouse.events.all(
   *   (mouseEvent, listenerController) => console.log(mouseEvent),
   *   { ignoreInjected: true }
   * );
   */
  public all(mouseListener: MouseListener, mouseListenerOptions?: MouseListenerOptions) {
    return this.on().listen(mouseListener, mouseListenerOptions);
  }

  /**
   * @description Listen to the given mouse events.
   *
   * @param actions Mouse actions to listen to.
   * @returns Listener builder.
   *
   * ---
   * @example
   * // Listen to all mouse left and right button events
   * Actionify.mouse.events.on("left", "right").listen((mouseEvent, listenerController) => console.log(mouseEvent));
   *
   * // Listen to all mouse left button press events
   * Actionify.mouse.events.on("left down").listen((mouseEvent, listenerController) => console.log(mouseEvent));
   *
   * // Listen to all mouse movement events
   * Actionify.mouse.events.on("move").listen((mouseEvent, listenerController) => console.log(mouseEvent));
   */
  public on(...actions: Array<`${MouseInput}` | `${MouseInput} ${MouseState}`>) {
    const mouseActions: MouseAction[] = actions.map((action) => {
      const parts = action.split(" ");
      const input = parts[0] as MouseInput;
      const state = parts[1] as MouseState | undefined;
      return { input, state };
    });
    return new MouseListenerScopeBuilder(mouseActions);
  }

  /**
   * @description Pause the given active mouse listener.
   *
   * @param listener The mouse listener to pause.
   *
   * ---
   * @example
   * // Listen to all mouse left and right button events
   * const mouseListener = (mouseEvent, listenerController) => console.log(mouseEvent);
   * const mouseListenerController = Actionify.mouse.events
   *   .on("left", "right")
   *   .listen(mouseListener);
   * // Pause the mouse listener
   * Actionify.mouse.events.pause(mouseListener);
   */
  public pause(listener: MouseListener) {
    const listenerScope = InputEventService.mouseListeners.find((mouseListener) => mouseListener.listener === listener);
    if (listenerScope) {
      listenerScope.isPaused = true;
    }
  }

  /**
   * @description Resume the given paused mouse listener.
   *
   * @param listener The mouse listener to resume.
   *
   * ---
   * @example
   * // Listen to all mouse left and right button events
   * const mouseListener = (mouseEvent, listenerController) => console.log(mouseEvent);
   * const mouseListenerController = Actionify.mouse.events
   *   .on("left", "right")
   *   .listen(mouseListener);
   * // Pause the mouse listener
   * Actionify.mouse.events.pause(mouseListener);
   * // Resume the mouse listener
   * Actionify.mouse.events.resume(mouseListener);
   */
  public resume(listener: MouseListener) {
    const listenerScope = InputEventService.mouseListeners.find((mouseListener) => mouseListener.listener === listener);
    if (listenerScope) {
      listenerScope.isPaused = false;
    }
  }

  /**
   * @description Stop and detach the given mouse listener.
   *
   * @param listener The mouse listener to stop and detach.
   *
   * ---
   * @example
   * // Listen to all mouse left and right button events
   * const mouseListener = (mouseEvent, listenerController) => console.log(mouseEvent);
   * const mouseListenerController = Actionify.mouse.events
   *   .on("left", "right")
   *   .listen(mouseListener);
   * // Stop and detach the mouse listener
   * Actionify.mouse.events.off(mouseListener);
   */
  public off(listener: MouseListener) {
    const listenerIndex = InputEventService.mouseListeners.findIndex((mouseListener) => mouseListener.listener === listener);
    if (listenerIndex !== -1) {
      InputEventService.mouseListeners.splice(listenerIndex, 1);
    }
    if (InputEventService.shouldStopMainListener) {
      stopInputEventListener();
    }
  }

  /**
   * @description Suppress the given mouse inputs.
   * Mouse listeners will not be affected and will still receive the events.
   *
   * **Caution**: these inputs will not have any effect until you `unsuppress` them.
   * Make sure not to be soft locked!
   *
   * @param actions Mouse actions to suppress.
   *
   * ---
   * @example
   * // Suppress all mouse left and right button events
   * Actionify.mouse.events.suppress("left", "right");
   *
   * // Suppress all mouse left button press events
   * Actionify.mouse.events.suppress("left down");
   *
   * // Suppress all mouse movement events
   * Actionify.mouse.events.suppress("move");
   */
  public suppress(...actions: Array<`${MouseInput}` | `${MouseInput} ${MouseState}`>) {
    if (actions.length === 0) {
      return;
    }
    const mouseActions: MouseAction[] = actions.map((action) => {
      const parts = action.split(" ");
      const input = parts[0] as MouseInput;
      const state = parts[1] as MouseState | undefined;
      return { input, state };
    });
    const mouseMappedInputsStates: Array<[number, Array<number>]> = [];
    for (const mouseAction of mouseActions) {
      let mappedInput = -1;
      switch (OperatingSystemService.platform) {
        case "win32":{
          switch (mouseAction.input) {
            case "move": mappedInput = 0; break;
            case "left": mappedInput = 1; break;
            case "right": mappedInput = 2; break;
            case "middle": mappedInput = 3; break;
            case "wheel": mappedInput = 4; break;
            case "extraButton1": mappedInput = 5; break;
            case "extraButton2": mappedInput = 6; break;
            default: break;
          }
          break;
        }
        case "linux": {
          switch (mouseAction.input) {
            case "move": mappedInput = 0; break;
            case "left": mappedInput = 1; break;
            case "middle": mappedInput = 2; break;
            case "right": mappedInput = 3; break;
            case "wheel": {
              switch (mouseAction.state) {
                case "down": mappedInput = 5; break;
                case "up": mappedInput = 4; break;
                default:
                  mouseMappedInputsStates.push([4, [0, 1, 2]]);
                  mappedInput = 5; // will be added to mouseMappedInputsStates the same way in the switch state below
                  break;
              }
              break;
            }
            case "extraButton1": mappedInput = 8; break;
            case "extraButton2": mappedInput = 9; break;
            default: break;
          }
          break;
        }
        default: break;
      }
      const mappedStates = [];
      switch (mouseAction.state) {
        case "down": mappedStates.push(0); break;
        case "up": mappedStates.push(1); break;
        case "neutral": mappedStates.push(2); break;
        default: mappedStates.push(0, 1, 2); break;
      }
      mouseMappedInputsStates.push([mappedInput, mappedStates]);
    }
    if (mouseMappedInputsStates.length > 0) {
      // Update global mouse suppressed input states
      for (const mouseMappedInputStates of mouseMappedInputsStates) {
        const mappedInput = mouseMappedInputStates[0];
        const mappedStates = mouseMappedInputStates[1];
        const existingSuppressedInputStates = InputEventService.mouseSuppressedInputStates.get(mappedInput);
        if (!existingSuppressedInputStates) {
          InputEventService.mouseSuppressedInputStates.set(mappedInput, new Set(mappedStates));
        }
        else {
          for (const mappedState of mappedStates) {
            if (!existingSuppressedInputStates.has(mappedState)) {
              existingSuppressedInputStates.add(mappedState);
            }
          }
        }
      }
      // Start input listener if not already running
      if (InputEventService.shouldStartMainListener) {
        LifecycleController.cleanBeforeExit();
        startInputEventListener(InputEventService.mainListener);
      }
      // Suppress mouse events
      suppressInputEvents(0, mouseMappedInputsStates);
    }
  }

  /**
   * @description Re-enable the given suppressed mouse inputs.
   *
   * @param actions Mouse actions to unsuppress.
   *
   * ---
   * @example
   * // Unsuppress all mouse left and right button events
   * Actionify.mouse.events.unsuppress("left", "right");
   *
   * // Unsuppress all mouse left button press events
   * Actionify.mouse.events.unsuppress("left down");
   *
   * // Unsuppress all mouse movement events
   * Actionify.mouse.events.unsuppress("move");
   */
  public unsuppress(...actions: Array<`${MouseInput}` | `${MouseInput} ${MouseState}`>) {
    if (actions.length === 0) {
      return;
    }
    const mouseActions: MouseAction[] = actions.map((action) => {
      const parts = action.split(" ");
      const input = parts[0] as MouseInput;
      const state = parts[1] as MouseState | undefined;
      return { input, state };
    });
    const mouseMappedInputsStates: Array<[number, Array<number>]> = [];
    for (const mouseAction of mouseActions) {
      let mappedInput = -1;
      switch (OperatingSystemService.platform) {
        case "win32":{
          switch (mouseAction.input) {
            case "move": mappedInput = 0; break;
            case "left": mappedInput = 1; break;
            case "right": mappedInput = 2; break;
            case "middle": mappedInput = 3; break;
            case "wheel": mappedInput = 4; break;
            case "extraButton1": mappedInput = 5; break;
            case "extraButton2": mappedInput = 6; break;
            default: break;
          }
          break;
        }
        case "linux": {
          switch (mouseAction.input) {
            case "move": mappedInput = 0; break;
            case "left": mappedInput = 1; break;
            case "middle": mappedInput = 2; break;
            case "right": mappedInput = 3; break;
            case "wheel": {
              switch (mouseAction.state) {
                case "down": mappedInput = 5; break;
                case "up": mappedInput = 4; break;
                default:
                  mouseMappedInputsStates.push([4, [0, 1, 2]]);
                  mappedInput = 5; // will be added to mouseMappedInputsStates the same way in the switch state below
                  break;
              }
              break;
            }
            case "extraButton1": mappedInput = 8; break;
            case "extraButton2": mappedInput = 9; break;
            default: break;
          }
          break;
        }
        default: break;
      }
      const mappedStates = [];
      switch (mouseAction.state) {
        case "down": mappedStates.push(0); break;
        case "up": mappedStates.push(1); break;
        case "neutral": mappedStates.push(2); break;
        default: mappedStates.push(0, 1, 2); break;
      }
      mouseMappedInputsStates.push([mappedInput, mappedStates]);
    }
    if (mouseMappedInputsStates.length > 0) {
      // Update global mouse suppressed input states
      for (const mouseMappedInputStates of mouseMappedInputsStates) {
        const mappedInput = mouseMappedInputStates[0];
        const mappedStates = mouseMappedInputStates[1];
        const existingSuppressedInputStates = InputEventService.mouseSuppressedInputStates.get(mappedInput);
        if (!existingSuppressedInputStates) {
          // The requested input was not suppressed, nothing to do
        }
        else {
          for (const mappedState of mappedStates) {
            // remove mappedState if found in existingMappedInputStates
            if (existingSuppressedInputStates.has(mappedState)) {
              existingSuppressedInputStates.delete(mappedState);
            }
          }
          if (existingSuppressedInputStates.size === 0) {
            // No more suppressed input states for the input, remove it from the map
            InputEventService.mouseSuppressedInputStates.delete(mappedInput);
          }
        }
      }
      // Unsuppress mouse events
      unsuppressInputEvents(0, mouseMappedInputsStates);
      // Stop input listener if now unused
      if (InputEventService.shouldStopMainListener) {
        stopInputEventListener();
      }
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
