import {
  startInputEventListener,
  stopInputEventListener,
  suppressInputEvents,
  unsuppressInputEvents,
} from "../../../../addon";
import { InputListenerScopeBuilder } from "../../../../core/builders";
import { LifecycleController } from "../../../../core/controllers";
import {
  InputEventService,
  KeyFormatter,
  KeyMapper,
  OperatingSystemService
} from "../../../../core/services";
import type {
  CaseInsensitiveKey,
  Input,
  InputAction,
  InputListener,
  InputListenerOptions,
  KeyState,
  MouseInput,
  MouseState,
} from "../../../../core/types";
import { Inspectable } from "../../../../core/utilities";

/**
 * @description Input events listening manager.
 */
export class InputEventsController {

  public constructor() { }

  /**
   * @description Attach the given input listener and start listening to all keyboard and mouse events.
   *
   * @param inputListener The input listener callback.
   * @param inputListenerOptions The input listener options. See {@link InputListenerOptions}.
   * @returns The input listener controller.
   *
   * ---
   * @example
   * // Listen to all keyboard and mouse events
   * Actionify.input.events.all((inputEvent, listenerController) => console.log(inputEvent));
   *
   * // Listen to all hardware/driver only keyboard and mouse events
   * Actionify.input.events.all(
   *   (inputEvent, listenerController) => console.log(inputEvent),
   *   { ignoreInjected: true }
   * );
   */
  public all(inputListener: InputListener, inputListenerOptions?: InputListenerOptions) {
    return this.on().listen(inputListener, inputListenerOptions);
  }

  /**
   * @description Listen to the given keyboard and/or mouse events.
   *
   * @param actions Input actions to listen to.
   * @returns Listener builder.
   *
   * ---
   * @example
   * // Listen to all keyboard and mouse events
   * Actionify.input.events.all((inputEvent, listenerController) => console.log(inputEvent));
   * // Listen to all hardware/driver only keyboard and mouse events
   * Actionify.input.events.all(
   *   (inputEvent, listenerController) => console.log(inputEvent),
   *   { ignoreInjected: true }
   * );
   *
   * // Listen to all keyboard "A" key and mouse "left" button events
   * Actionify.input.events.on("a", "left").listen((inputEvent, listenerController) => console.log(inputEvent));
   * // Listen to all hardware/driver only keyboard "A" key and mouse "left" button events
   * Actionify.input.events.on("a", "left").listen(
   *   (inputEvent, listenerController) => console.log(inputEvent),
   *   { ignoreInjected: true }
   * );
   */
  public on(...actions: Array<`${MouseInput}` | `${MouseInput} ${MouseState}` | `${CaseInsensitiveKey<any>}` | `${CaseInsensitiveKey<any>} ${KeyState}`>) {
    const inputActions: InputAction[] = actions.map((action) => {
      const parts = action.split(" ");
      const input = parts[0] as Input;
      if (["move", "left", "middle", "right", "wheel", "extraButton1", "extraButton2"].includes(input)) {
        const mouseType = "mouse";
        const mouseInput = input as MouseInput;
        const mouseState = parts[1] as MouseState | undefined;
        return { type: mouseType, input: mouseInput, state: mouseState };
      }
      const keyboardType = "keyboard";
      const keyboardInput = KeyMapper.toKeyCode(KeyFormatter.format(parts[0]));
      const keyboardState = parts[1] as KeyState | undefined;
      return { type: keyboardType, input: keyboardInput, state: keyboardState };
    });
    return new InputListenerScopeBuilder(inputActions);
  }

  /**
   * @description Pause the given active input listener.
   *
   * @param listener The input listener to pause.
   *
   * ---
   * @example
   * // Listen to all keyboard and mouse events
   * const inputListener = (inputEvent, listenerController) => console.log(inputEvent);
   * const inputListenerController = Actionify.input.events
   *   .all(inputListener);
   * // Pause the input listener
   * Actionify.input.events.pause(inputListener);
   */
  public pause(listener: InputListener) {
    const listenerScope = InputEventService.inputListeners.find((inputListener) => inputListener.listener === listener);
    if (listenerScope) {
      listenerScope.isPaused = true;
    }
  }

  /**
   * @description Resume the given paused input listener.
   *
   * @param listener The input listener to resume.
   *
   * ---
   * @example
   * // Listen to all keyboard and mouse events
   * const inputListener = (inputEvent, listenerController) => console.log(inputEvent);
   * const inputListenerController = Actionify.input.events
   *   .all(inputListener);
   * // Pause the input listener
   * Actionify.input.events.pause(inputListener);
   * // Resume the input listener
   * Actionify.input.events.resume(inputListener);
   */
  public resume(listener: InputListener) {
    const listenerScope = InputEventService.inputListeners.find((inputListener) => inputListener.listener === listener);
    if (listenerScope) {
      listenerScope.isPaused = false;
    }
  }

  /**
   * @description Stop and detach the given input listener.
   *
   * @param listener The input listener to stop and detach.
   *
   * ---
   * @example
   * // Listen to all keyboard and mouse events
   * const inputListener = (inputEvent, listenerController) => console.log(inputEvent);
   * const inputListenerController = Actionify.input.events
   *   .all(inputListener);
   * // Stop and detach the input listener
   * Actionify.input.events.off(inputListener);
   */
  public off(listener: InputListener) {
    const listenerIndex = InputEventService.inputListeners.findIndex((inputListener) => inputListener.listener === listener);
    if (listenerIndex !== -1) {
      InputEventService.inputListeners.splice(listenerIndex, 1);
    }
    if (InputEventService.shouldStopMainListener) {
      stopInputEventListener();
    }
  }

  /**
   * @description Suppress the given input events.
   * Input listeners will not be affected and will still receive the events.
   *
   * **Caution**: these inputs will not have any effect until you `unsuppress` them.
   * Make sure not to be soft locked!
   *
   * @param actions Input actions to suppress.
   *
   * ---
   * @example
   * // Suppress all keyboard "A" key and mouse "left" button events
   * Actionify.input.events.suppress("a", "left");
   */
  public suppress(...actions: Array<`${MouseInput}` | `${MouseInput} ${MouseState}` | `${CaseInsensitiveKey<any>}` | `${CaseInsensitiveKey<any>} ${KeyState}`>) {
    if (actions.length === 0) {
      return;
    }
    const inputActions: InputAction[] = actions.map((action) => {
      const parts = action.split(" ");
      const input = parts[0] as Input;
      if (["move", "left", "middle", "right", "wheel", "extraButton1", "extraButton2"].includes(input)) {
        const mouseType = "mouse";
        const mouseInput = input as MouseInput;
        const mouseState = parts[1] as MouseState | undefined;
        return { type: mouseType, input: mouseInput, state: mouseState };
      }
      const keyboardType = "keyboard";
      const keyboardInput = KeyMapper.toKeyCode(KeyFormatter.format(parts[0]));
      const keyboardState = parts[1] as KeyState | undefined;
      return { type: keyboardType, input: keyboardInput, state: keyboardState };
    });
    const mouseMappedInputsStates: Array<[number, Array<number>]> = [];
    const keyboardMappedInputsStates: Array<[number, Array<number>]> = [];
    for (const inputAction of inputActions) {
      if (inputAction.type === "mouse") {
        let mappedInput = -1;
        switch (OperatingSystemService.platform) {
          case "win32":{
            switch (inputAction.input) {
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
            switch (inputAction.input) {
              case "move": mappedInput = 0; break;
              case "left": mappedInput = 1; break;
              case "middle": mappedInput = 2; break;
              case "right": mappedInput = 3; break;
              case "wheel": {
                switch (inputAction.state) {
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
        switch (inputAction.state) {
          case "down": mappedStates.push(0); break;
          case "up": mappedStates.push(1); break;
          case "neutral": mappedStates.push(2); break;
          default: mappedStates.push(0, 1, 2); break;
        }
        mouseMappedInputsStates.push([mappedInput, mappedStates]);
      }
      else {
        const mappedInput = inputAction.input;
        const mappedStates = [];
        switch (inputAction.state) {
          case "down": mappedStates.push(0); break;
          case "up": mappedStates.push(1); break;
          default: mappedStates.push(0, 1); break;
        }
        keyboardMappedInputsStates.push([mappedInput, mappedStates]);
      }
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
    if (keyboardMappedInputsStates.length > 0) {
      // Update global keyboard suppressed input states
      for (const keyboardMappedInputStates of keyboardMappedInputsStates) {
        const mappedInput = keyboardMappedInputStates[0];
        const mappedStates = keyboardMappedInputStates[1];
        const existingSuppressedInputStates = InputEventService.keyboardSuppressedInputStates.get(mappedInput);
        if (!existingSuppressedInputStates) {
          InputEventService.keyboardSuppressedInputStates.set(mappedInput, new Set(mappedStates));
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
      // Suppress keyboard events
      suppressInputEvents(1, keyboardMappedInputsStates);
    }
  }

  /**
   * @description Re-enable the given suppressed inputs.
   *
   * @param actions Input actions to unsuppress.
   *
   * ---
   * @example
   * // Unsuppress all keyboard "A" key and mouse "left" button events
   * Actionify.input.events.unsuppress("a", "left");
   */
  public unsuppress(...actions: Array<`${MouseInput}` | `${MouseInput} ${MouseState}` | `${CaseInsensitiveKey<any>}` | `${CaseInsensitiveKey<any>} ${KeyState}`>) {
    if (actions.length === 0) {
      return;
    }
    const inputActions: InputAction[] = actions.map((action) => {
      const parts = action.split(" ");
      const input = parts[0] as Input;
      if (["move", "left", "middle", "right", "wheel", "extraButton1", "extraButton2"].includes(input)) {
        const mouseType = "mouse";
        const mouseInput = input as MouseInput;
        const mouseState = parts[1] as MouseState | undefined;
        return { type: mouseType, input: mouseInput, state: mouseState };
      }
      const keyboardType = "keyboard";
      const keyboardInput = KeyMapper.toKeyCode(KeyFormatter.format(parts[0]));
      const keyboardState = parts[1] as KeyState | undefined;
      return { type: keyboardType, input: keyboardInput, state: keyboardState };
    });
    const mouseMappedInputsStates: Array<[number, Array<number>]> = [];
    const keyboardMappedInputsStates: Array<[number, Array<number>]> = [];
    for (const inputAction of inputActions) {
      if (inputAction.type === "mouse") {
        let mappedInput = -1;
        switch (OperatingSystemService.platform) {
          case "win32":{
            switch (inputAction.input) {
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
            switch (inputAction.input) {
              case "move": mappedInput = 0; break;
              case "left": mappedInput = 1; break;
              case "middle": mappedInput = 2; break;
              case "right": mappedInput = 3; break;
              case "wheel": {
                switch (inputAction.state) {
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
        switch (inputAction.state) {
          case "down": mappedStates.push(0); break;
          case "up": mappedStates.push(1); break;
          case "neutral": mappedStates.push(2); break;
          default: mappedStates.push(0, 1, 2); break;
        }
        mouseMappedInputsStates.push([mappedInput, mappedStates]);
      }
      else {
        const mappedInput = inputAction.input;
        const mappedStates = [];
        switch (inputAction.state) {
          case "down": mappedStates.push(0); break;
          case "up": mappedStates.push(1); break;
          default: mappedStates.push(0, 1); break;
        }
        keyboardMappedInputsStates.push([mappedInput, mappedStates]);
      }
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
    if (keyboardMappedInputsStates.length > 0) {
      // Update global keyboard suppressed input states
      for (const keyboardMappedInputStates of keyboardMappedInputsStates) {
        const mappedInput = keyboardMappedInputStates[0];
        const mappedStates = keyboardMappedInputStates[1];
        const existingSuppressedInputStates = InputEventService.keyboardSuppressedInputStates.get(mappedInput);
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
            InputEventService.keyboardSuppressedInputStates.delete(mappedInput);
          }
        }
      }
      // Unsuppress keyboard events
      unsuppressInputEvents(1, keyboardMappedInputsStates);
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
