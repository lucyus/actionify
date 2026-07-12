import {
  startInputEventListener,
  stopInputEventListener,
  suppressInputEvents,
  unsuppressInputEvents,
} from "../../../../addon";
import { KeyboardListenerScopeBuilder } from "../../../../core/builders";
import { LifecycleController } from "../../../../core/controllers";
import { InputEventService, KeyFormatter, KeyMapper } from "../../../../core/services";
import type {
  CaseInsensitiveKey,
  KeyAction,
  KeyboardListener,
  KeyboardListenerOptions,
  KeyState,
} from "../../../../core/types";
import { Inspectable } from "../../../../core/utilities";

/**
 * @description Keyboard events listening manager.
 */
export class KeyboardEventsController {

  public constructor() { }

  /**
   * @description Attach the given keyboard listener and start listening to all keyboard events.
   *
   * @param keyboardListener The keyboard listener callback.
   * @param keyboardListenerOptions The keyboard listener options. See {@link KeyboardListenerOptions}.
   * @returns The keyboard listener controller.
   *
   * ---
   * @example
   * // Listen to all keyboard events
   * Actionify.keyboard.events.all((keyboardEvent, listenerController) => console.log(keyboardEvent));
   *
   * // Listen to all hardware/driver only keyboard events
   * Actionify.keyboard.events.all(
   *   (keyboardEvent, listenerController) => console.log(keyboardEvent),
   *   { ignoreInjected: true }
   * );
   */
  public all(keyboardListener: KeyboardListener, keyboardListenerOptions?: KeyboardListenerOptions) {
    return this.on().listen(keyboardListener, keyboardListenerOptions);
  }

  /**
   * @description Listen to the given keyboard events.
   *
   * @param actions The keyboard actions to listen to.
   * @returns Listener builder.
   *
   * ---
   * @example
   * // Listen to all keyboard "A" and "B" key events
   * Actionify.keyboard.events.on("a", "b").listen((keyboardEvent, listenerController) => console.log(keyboardEvent));
   *
   * // Listen to all keyboard "A" key down events
   * Actionify.keyboard.events.on("a down").listen((keyboardEvent, listenerController) => console.log(keyboardEvent));
   */
  on(...actions: Array<`${CaseInsensitiveKey<any>}` | `${CaseInsensitiveKey<any>} ${KeyState}`>) {
    const keyboardActions: KeyAction[] = actions.map((action) => {
      const parts = action.split(" ");
      const input = KeyMapper.toKeyCode(KeyFormatter.format(parts[0]));
      const state = parts[1] as KeyState | undefined;
      return { input, state };
    });
    return new KeyboardListenerScopeBuilder(keyboardActions);
  }

  /**
   * @description Resume the given paused keyboard listener.
   *
   * @param listener The keyboard listener to resume.
   *
   * ---
   * @example
   * // Listen to all keyboard "A" and "B" key events
   * const keyboardListener = (keyboardEvent, listenerController) => console.log(keyboardEvent);
   * const keyboardListenerController = Actionify.keyboard.events
   *   .on("a", "b")
   *   .listen(keyboardListener);
   * // Pause the keyboard listener
   * Actionify.keyboard.events.pause(keyboardListener);
   * // Resume the keyboard listener
   * Actionify.keyboard.events.resume(keyboardListener);
   */
  public resume(listener: KeyboardListener) {
    const listenerScope = InputEventService.keyboardListeners.find((keyboardListener) => keyboardListener.listener === listener);
    if (listenerScope) {
      listenerScope.isPaused = false;
    }
  }

  /**
   * @description Pause the given keyboard listener.
   *
   * @param listener The keyboard listener to pause.
   *
   * ---
   * @example
   * // Listen to all keyboard "A" and "B" key events
   * const keyboardListener = (keyboardEvent, listenerController) => console.log(keyboardEvent);
   * const keyboardListenerController = Actionify.keyboard.events
   *   .on("a", "b")
   *   .listen(keyboardListener);
   * // Pause the keyboard listener
   * Actionify.keyboard.events.pause(keyboardListener);
   */
  public pause(listener: KeyboardListener) {
    const listenerScope = InputEventService.keyboardListeners.find((keyboardListener) => keyboardListener.listener === listener);
    if (listenerScope) {
      listenerScope.isPaused = true;
    }
  }

  /**
   * @description Stop and detach the given keyboard listener.
   *
   * @param listener The keyboard listener to stop and detach.
   *
   * ---
   * @example
   * // Listen to all keyboard "A" and "B" key events
   * const keyboardListener = (keyboardEvent, listenerController) => console.log(keyboardEvent);
   * const keyboardListenerController = Actionify.keyboard.events
   *   .on("a", "b")
   *   .listen(keyboardListener);
   * // Stop and detach the keyboard listener
   * Actionify.keyboard.events.off(keyboardListener);
   */
  public off(listener: KeyboardListener) {
    const listenerIndex = InputEventService.keyboardListeners.findIndex((keyboardListener) => keyboardListener.listener === listener);
    if (listenerIndex !== -1) {
      InputEventService.keyboardListeners.splice(listenerIndex, 1);
    }
    if (InputEventService.shouldStopMainListener) {
      stopInputEventListener();
    }
  }

  /**
   * @description Suppress the given keyboard actions.
   * Keyboard listeners will not be affected and will still receive the events.
   *
   * **Caution**: these inputs will not have any effect until you `unsuppress` them.
   * Make sure not to be soft locked!
   *
   * @param actions Keyboard actions to suppress.
   *
   * ---
   * @example
   * // Suppress all keyboard "A" and "B" key events
   * Actionify.keyboard.events.suppress("a", "b");
   *
   * // Suppress all keyboard "A" key down events
   * Actionify.keyboard.events.suppress("a down");
   */
  public suppress(...actions: Array<`${CaseInsensitiveKey<any>}` | `${CaseInsensitiveKey<any>} ${KeyState}`>) {
    if (actions.length === 0) {
      return;
    }
    const keyboardActions: KeyAction[] = actions.map((action) => {
      const parts = action.split(" ");
      const input = KeyMapper.toKeyCode(KeyFormatter.format(parts[0]));
      const state = parts[1] as KeyState | undefined;
      return { input, state };
    });
    const keyboardMappedInputsStates: Array<[number, Array<number>]> = [];
    for (const keyboardAction of keyboardActions) {
      const mappedInput = keyboardAction.input;
      const mappedStates = [];
      switch (keyboardAction.state) {
        case "down": mappedStates.push(0); break;
        case "up": mappedStates.push(1); break;
        default: mappedStates.push(0, 1); break;
      }
      keyboardMappedInputsStates.push([mappedInput, mappedStates]);
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
   * @description Re-enable the given suppressed keyboard inputs.
   *
   * @param actions Keyboard actions to unsuppress.
   *
   * ---
   * @example
   * // Unsuppress all keyboard "A" and "B" key events
   * Actionify.keyboard.events.unsuppress("a", "b");
   *
   * // Unsuppress all keyboard "A" key down events
   * Actionify.keyboard.events.unsuppress("a down");
   */
  public unsuppress(...actions: Array<`${CaseInsensitiveKey<any>}` | `${CaseInsensitiveKey<any>} ${KeyState}`>) {
    if (actions.length === 0) {
      return;
    }
    const keyboardActions: KeyAction[] = actions.map((action) => {
      const parts = action.split(" ");
      const input = KeyMapper.toKeyCode(KeyFormatter.format(parts[0]));
      const state = parts[1] as KeyState | undefined;
      return { input, state };
    });
    const keyboardMappedInputsStates: Array<[number, Array<number>]> = [];
    for (const keyboardAction of keyboardActions) {
      const mappedInput = keyboardAction.input;
      const mappedStates = [];
      switch (keyboardAction.state) {
        case "down": mappedStates.push(0); break;
        case "up": mappedStates.push(1); break;
        default: mappedStates.push(0, 1); break;
      }
      keyboardMappedInputsStates.push([mappedInput, mappedStates]);
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
