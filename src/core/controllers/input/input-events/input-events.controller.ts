import {
  stopEventListener,
  suppressInputEvents,
  unsuppressInputEvents,
} from "../../../../addon";
import { InputListenerScopeBuilder } from "../../../../core/builders";
import {
  InputEventService,
  KeyFormatter,
  KeyMapper
} from "../../../../core/services";
import type {
  CaseInsensitiveKey,
  Input,
  InputAction,
  InputListener,
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
   * @returns The input listener controller.
   *
   * ---
   * @example
   * Actionify.input.events.all((inputEvent, listenerController) => console.log(inputEvent));
   */
  public all(inputListener: InputListener) {
    return this.on().listen(inputListener);
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
   *
   * // Listen to all keyboard "A" key and mouse "left" button events
   * Actionify.input.events.on("a", "left").listen((inputEvent, listenerController) => console.log(inputEvent));
   */
  public on(...actions: Array<`${MouseInput}` | `${MouseInput} ${MouseState}` | `${CaseInsensitiveKey<any>}` | `${CaseInsensitiveKey<any>} ${KeyState}`>) {
    const inputActions: InputAction[] = actions.map((action) => {
      const parts = action.split(" ");
      const input = parts[0] as Input;
      if (["move", "left", "middle", "right", "wheel"].includes(input)) {
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
      stopEventListener();
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
      if (["move", "left", "middle", "right", "wheel"].includes(input)) {
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
        switch (inputAction.input) {
          case "move": mappedInput = 0; break;
          case "left": mappedInput = 1; break;
          case "right": mappedInput = 2; break;
          case "middle": mappedInput = 3; break;
          case "wheel": mappedInput = 4; break;
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
      suppressInputEvents(0, mouseMappedInputsStates);
    }
    if (keyboardMappedInputsStates.length > 0) {
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
      if (["move", "left", "middle", "right", "wheel"].includes(input)) {
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
        switch (inputAction.input) {
          case "move": mappedInput = 0; break;
          case "left": mappedInput = 1; break;
          case "right": mappedInput = 2; break;
          case "middle": mappedInput = 3; break;
          case "wheel": mappedInput = 4; break;
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
      unsuppressInputEvents(0, mouseMappedInputsStates);
    }
    if (keyboardMappedInputsStates.length > 0) {
      unsuppressInputEvents(1, keyboardMappedInputsStates);
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
