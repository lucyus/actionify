import {
  InputListenerScopeController,
  InputRecorderScopeController,
  KeyboardListenerScopeController,
  KeyboardRecorderScopeController,
  MouseListenerScopeController,
  MouseRecorderScopeController,
} from "../../../../core/controllers";
import { InputStateService } from "../../../../core/services";
import type { InputEvent, KeyboardEvent, MouseEvent } from "../../../../core/types";
import { Inspectable } from "../../../../core/utilities";

/**
 * @description Manage declared input listeners and recorders.
 */
export class InputEventService {

  static #inputListeners: Array<InputListenerScopeController> = [];
  static #inputRecorders: Array<InputRecorderScopeController> = [];
  static #keyboardListeners: Array<KeyboardListenerScopeController> = [];
  static #keyboardRecorders: Array<KeyboardRecorderScopeController> = [];
  static #mouseListeners: Array<MouseListenerScopeController> = [];
  static #mouseRecorders: Array<MouseRecorderScopeController> = [];

  protected constructor() { }

  /**
   * @description Handle input events and run declared listeners and recorders accordingly.
   * This function is called by C++ Mouse and Keyboard low-level hooks.
   *
   * @param currentEvent
   */
  static async #mainListener(currentEvent: InputEvent) {
    switch (currentEvent.type) {
      case "mouse": {
        // initialize list of runners
        const mouseListenersToRun: MouseListenerScopeController[] = [];
        const mouseRecordersToRun: MouseRecorderScopeController[] = [];
        const inputListenersToRun: InputListenerScopeController[] = [];
        const inputRecordersToRun: InputRecorderScopeController[] = [];
        // save current mouse event to history
        const currentMouseEvent = currentEvent;
        InputStateService.mouseStateHistory.set(currentMouseEvent.input, currentMouseEvent);
        // Find mouse listeners that are listening to the current mouse event
        const activeMouseListeners = InputEventService.mouseListeners.filter((mouseListener) => !mouseListener.isPaused && !mouseListener.isRunning);
        for (const mouseListener of activeMouseListeners) {
          const isListeningToCurrentMouseEvent = mouseListener.when.length === 0 || mouseListener.when.find((mouseAction) => mouseAction.input === currentMouseEvent.input) !== undefined;
          if (isListeningToCurrentMouseEvent) {
            let countConditionsMet = 0;
            for (const mouseActionExpected of mouseListener.when) {
              const latestSimilarMouseEvent = InputStateService.mouseStateHistory.get(mouseActionExpected.input);
              if (mouseActionExpected.state === undefined || (latestSimilarMouseEvent && latestSimilarMouseEvent.state === mouseActionExpected.state)) {
                countConditionsMet++;
              }
            }
            if (countConditionsMet === mouseListener.when.length) {
              mouseListenersToRun.push(mouseListener);
            }
          }
        }
        // Find input listeners that are listening to the current mouse event
        const activeInputListeners = InputEventService.inputListeners.filter((inputListener) => !inputListener.isPaused && !inputListener.isRunning);
        for (const inputListener of activeInputListeners) {
          const isListeningToCurrentMouseEvent = inputListener.when.length === 0 || inputListener.when.find((inputAction) => inputAction.input === currentMouseEvent.input) !== undefined;
          if (isListeningToCurrentMouseEvent) {
            let countConditionsMet = 0;
            for (const inputActionExpected of inputListener.when) {
              if (inputActionExpected.type === "mouse") {
                const latestSimilarMouseEvent = InputStateService.mouseStateHistory.get(inputActionExpected.input);
                if (inputActionExpected.state === undefined || (latestSimilarMouseEvent && latestSimilarMouseEvent.state === inputActionExpected.state)) {
                  countConditionsMet++;
                }
              }
              else {
                const latestSimilarKeyboardEvent = InputStateService.keyboardStateHistory.get(inputActionExpected.input);
                if (inputActionExpected.state === undefined || (latestSimilarKeyboardEvent && latestSimilarKeyboardEvent.state === inputActionExpected.state)) {
                  countConditionsMet++;
                }
              }
            }
            if (countConditionsMet === inputListener.when.length) {
              inputListenersToRun.push(inputListener);
            }
          }
        }
        // Run eligible mouse listeners
        for (const mouseListener of mouseListenersToRun) {
          mouseListener.isRunning = true;
          const result = mouseListener.listener(currentMouseEvent, mouseListener.listenerController);
          if (result instanceof Promise) {
            result
              .catch((error) => { console.error(error) })
              .finally(() => { mouseListener.isRunning = false; })
            ;
          }
          else {
            mouseListener.isRunning = false;
          }
        }
        // Run eligible input listeners
        for (const inputListener of inputListenersToRun) {
          inputListener.isRunning = true;
          const result = inputListener.listener(currentMouseEvent, inputListener.listenerController);
          if (result instanceof Promise) {
            result
              .catch((error) => { console.error(error) })
              .finally(() => { inputListener.isRunning = false; })
            ;
          }
          else {
            inputListener.isRunning = false;
          }
        }
        // Find mouse recorders that are listening to the current mouse event
        const activeMouseRecorders = InputEventService.mouseRecorders.filter((mouseRecorder) => !mouseRecorder.isPaused);
        for (const mouseRecorder of activeMouseRecorders) {
          const isListeningToCurrentMouseEvent = mouseRecorder.when.length === 0 || mouseRecorder.when.find((mouseAction) => mouseAction.input === currentMouseEvent.input) !== undefined;
          if (isListeningToCurrentMouseEvent) {
            let countConditionsMet = 0;
            for (const mouseActionExpected of mouseRecorder.when) {
              const latestSimilarMouseEvent = InputStateService.mouseStateHistory.get(mouseActionExpected.input);
              if (mouseActionExpected.state === undefined || (latestSimilarMouseEvent && latestSimilarMouseEvent.state === mouseActionExpected.state)) {
                countConditionsMet++;
              }
            }
            if (countConditionsMet === mouseRecorder.when.length) {
              mouseRecordersToRun.push(mouseRecorder);
            }
          }
        }
        // Find input recorders that are listening to the current mouse event
        const activeInputRecorders = InputEventService.inputRecorders.filter((inputRecorder) => !inputRecorder.isPaused);
        for (const inputRecorder of activeInputRecorders) {
          const isListeningToCurrentMouseEvent = inputRecorder.when.length === 0 || inputRecorder.when.find((inputAction) => inputAction.input === currentMouseEvent.input) !== undefined;
          if (isListeningToCurrentMouseEvent) {
            let countConditionsMet = 0;
            for (const inputActionExpected of inputRecorder.when) {
              if (inputActionExpected.type === "mouse") {
                const latestSimilarMouseEvent = InputStateService.mouseStateHistory.get(inputActionExpected.input);
                if (inputActionExpected.state === undefined || (latestSimilarMouseEvent && latestSimilarMouseEvent.state === inputActionExpected.state)) {
                  countConditionsMet++;
                }
              }
              else {
                const latestSimilarKeyboardEvent = InputStateService.keyboardStateHistory.get(inputActionExpected.input);
                if (inputActionExpected.state === undefined || (latestSimilarKeyboardEvent && latestSimilarKeyboardEvent.state === inputActionExpected.state)) {
                  countConditionsMet++;
                }
              }
            }
            if (countConditionsMet === inputRecorder.when.length) {
              inputRecordersToRun.push(inputRecorder);
            }
          }
        }
        // Run eligible mouse recorders
        for (const mouseRecorder of mouseRecordersToRun) {
          const type = 0;
          let input = -1;
          switch (currentMouseEvent.input) {
            case "move":
              input = 0;
              break;
            case "left":
              input = 1;
              break;
            case "right":
              input = 2;
              break;
            case "middle":
              input = 3;
              break;
            case "wheel":
              input = 4;
              break;
            default:
              input = -1;
              break;
          }
          let state = -1;
          switch (currentMouseEvent.state) {
            case "down":
              state = 0;
              break;
            case "up":
              state = 1;
              break;
            case "neutral":
              state = 2;
              break;
            default:
              state = -1;
              break;
          }
          const x = currentMouseEvent.position.x;
          const y = currentMouseEvent.position.y;
          const timestamp = currentMouseEvent.timestamp;
          const csvLine = `${type},${timestamp},${input},${state},${x},${y}\n`;
          mouseRecorder.writeStream.write(csvLine);
        }
        // Run eligible input recorders
        for (const inputRecorder of inputRecordersToRun) {
          const type = 0;
          let input = -1;
          switch (currentMouseEvent.input) {
            case "move":
              input = 0;
              break;
            case "left":
              input = 1;
              break;
            case "right":
              input = 2;
              break;
            case "middle":
              input = 3;
              break;
            case "wheel":
              input = 4;
              break;
            default:
              input = -1;
              break;
          }
          let state = -1;
          switch (currentMouseEvent.state) {
            case "down":
              state = 0;
              break;
            case "up":
              state = 1;
              break;
            case "neutral":
              state = 2;
              break;
            default:
              state = -1;
              break;
          }
          const x = currentMouseEvent.position.x;
          const y = currentMouseEvent.position.y;
          const timestamp = currentMouseEvent.timestamp;
          const csvLine = `${type},${timestamp},${input},${state},${x},${y}\n`;
          inputRecorder.writeStream.write(csvLine);
        }
        break;
      }
      case "keyboard": {
        // initialize list of runners
        const keyboardListenersToRun: KeyboardListenerScopeController[] = [];
        const keyboardRecordersToRun: KeyboardRecorderScopeController[] = [];
        const inputListenersToRun: InputListenerScopeController[] = [];
        const inputRecordersToRun: InputRecorderScopeController[] = [];
        // save current keyboard event to history
        const currentKeyboardEvent = currentEvent;
        InputStateService.keyboardStateHistory.set(currentKeyboardEvent.input, currentKeyboardEvent);
        // Find keyboard listeners that are listening to the current keyboard event
        const activeKeyboardListeners = InputEventService.keyboardListeners.filter((keyboardListener) => !keyboardListener.isPaused && !keyboardListener.isRunning);
        for (const keyboardListener of activeKeyboardListeners) {
          const isListeningToCurrentKeyboardEvent = keyboardListener.when.length === 0 || keyboardListener.when.find((keyboardAction) => keyboardAction.input === currentKeyboardEvent.input) !== undefined;
          if (isListeningToCurrentKeyboardEvent) {
            let countConditionsMet = 0;
            for (const keyboardActionExpected of keyboardListener.when) {
              const latestSimilarKeyboardEvent = InputStateService.keyboardStateHistory.get(keyboardActionExpected.input);
              if (keyboardActionExpected.state === undefined || (latestSimilarKeyboardEvent && latestSimilarKeyboardEvent.state === keyboardActionExpected.state)) {
                countConditionsMet++;
              }
            }
            if (countConditionsMet === keyboardListener.when.length) {
              keyboardListenersToRun.push(keyboardListener);
            }
          }
        }
        // Find input listeners that are listening to the current keyboard event
        const activeInputListeners = InputEventService.inputListeners.filter((inputListener) => !inputListener.isPaused && !inputListener.isRunning);
        for (const inputListener of activeInputListeners) {
          const isListeningToCurrentKeyboardEvent = inputListener.when.length === 0 || inputListener.when.find((inputAction) => inputAction.input === currentKeyboardEvent.input) !== undefined;
          if (isListeningToCurrentKeyboardEvent) {
            let countConditionsMet = 0;
            for (const inputActionExpected of inputListener.when) {
              if (inputActionExpected.type === "mouse") {
                const latestSimilarMouseEvent = InputStateService.mouseStateHistory.get(inputActionExpected.input);
                if (inputActionExpected.state === undefined || (latestSimilarMouseEvent && latestSimilarMouseEvent.state === inputActionExpected.state)) {
                  countConditionsMet++;
                }
              }
              else {
                const latestSimilarKeyboardEvent = InputStateService.keyboardStateHistory.get(inputActionExpected.input);
                if (inputActionExpected.state === undefined || (latestSimilarKeyboardEvent && latestSimilarKeyboardEvent.state === inputActionExpected.state)) {
                  countConditionsMet++;
                }
              }
            }
            if (countConditionsMet === inputListener.when.length) {
              inputListenersToRun.push(inputListener);
            }
          }
        }
        // Run eligible keyboard listeners
        for (const keyboardListener of keyboardListenersToRun) {
          keyboardListener.isRunning = true;
          const result = keyboardListener.listener(currentKeyboardEvent, keyboardListener.listenerController);
          if (result instanceof Promise) {
            result
              .catch((error) => { console.error(error); })
              .finally(() => { keyboardListener.isRunning = false; })
            ;
          }
          else {
            keyboardListener.isRunning = false;
          }
        }
        // Run eligible input listeners
        for (const inputListener of inputListenersToRun) {
          inputListener.isRunning = true;
          const result = inputListener.listener(currentKeyboardEvent, inputListener.listenerController);
          if (result instanceof Promise) {
            result
              .catch((error) => { console.error(error); })
              .finally(() => { inputListener.isRunning = false; })
            ;
          }
          else {
            inputListener.isRunning = false;
          }
        }
        // Find keyboard recorders that are listening to the current keyboard event
        const activeKeyboardRecorders = InputEventService.keyboardRecorders.filter((keyboardRecorder) => !keyboardRecorder.isPaused);
        for (const keyboardRecorder of activeKeyboardRecorders) {
          const isListeningToCurrentKeyboardEvent = keyboardRecorder.when.length === 0 || keyboardRecorder.when.find((keyboardAction) => keyboardAction.input === currentKeyboardEvent.input) !== undefined;
          if (isListeningToCurrentKeyboardEvent) {
            let countConditionsMet = 0;
            for (const keyboardActionExpected of keyboardRecorder.when) {
              const latestSimilarKeyboardEvent = InputStateService.keyboardStateHistory.get(keyboardActionExpected.input);
              if (keyboardActionExpected.state === undefined || (latestSimilarKeyboardEvent && latestSimilarKeyboardEvent.state === keyboardActionExpected.state)) {
                countConditionsMet++;
              }
            }
            if (countConditionsMet === keyboardRecorder.when.length) {
              keyboardRecordersToRun.push(keyboardRecorder);
            }
          }
        }
        // Find input recorders that are listening to the current keyboard event
        const activeInputRecorders = InputEventService.inputRecorders.filter((inputRecorder) => !inputRecorder.isPaused);
        for (const inputRecorder of activeInputRecorders) {
          const isListeningToCurrentKeyboardEvent = inputRecorder.when.length === 0 || inputRecorder.when.find((inputAction) => inputAction.input === currentKeyboardEvent.input) !== undefined;
          if (isListeningToCurrentKeyboardEvent) {
            let countConditionsMet = 0;
            for (const inputActionExpected of inputRecorder.when) {
              if (inputActionExpected.type === "mouse") {
                const latestSimilarMouseEvent = InputStateService.mouseStateHistory.get(inputActionExpected.input);
                if (inputActionExpected.state === undefined || (latestSimilarMouseEvent && latestSimilarMouseEvent.state === inputActionExpected.state)) {
                  countConditionsMet++;
                }
              }
              else {
                const latestSimilarKeyboardEvent = InputStateService.keyboardStateHistory.get(inputActionExpected.input);
                if (inputActionExpected.state === undefined || (latestSimilarKeyboardEvent && latestSimilarKeyboardEvent.state === inputActionExpected.state)) {
                  countConditionsMet++;
                }
              }
            }
            if (countConditionsMet === inputRecorder.when.length) {
              inputRecordersToRun.push(inputRecorder);
            }
          }
        }
        // Run eligible keyboard recorders
        for (const keyboardRecorder of keyboardRecordersToRun) {
          const type = 1;
          const timestamp = currentKeyboardEvent.timestamp;
          const input = currentKeyboardEvent.input;
          let state = -1;
          switch (currentKeyboardEvent.state) {
            case "down":
              state = 0;
              break;
            case "up":
              state = 1;
              break;
            default:
              state = -1;
              break;
          }
          const csvLine = `${type},${timestamp},${input},${state}\n`;
          keyboardRecorder.writeStream.write(csvLine);
        }
        // Run eligible input recorders
        for (const inputRecorder of inputRecordersToRun) {
          const type = 1;
          const timestamp = currentKeyboardEvent.timestamp;
          const input = currentKeyboardEvent.input;
          let state = -1;
          switch (currentKeyboardEvent.state) {
            case "down":
              state = 0;
              break;
            case "up":
              state = 1;
              break;
            default:
              state = -1;
              break;
          }
          const csvLine = `${type},${timestamp},${input},${state}\n`;
          inputRecorder.writeStream.write(csvLine);
        }
        break;
      }
      default:
        break;
    }
  }

  public static get inputListeners(): Array<InputListenerScopeController> {
    return InputEventService.#inputListeners;
  }

  public static get inputRecorders(): Array<InputRecorderScopeController> {
    return InputEventService.#inputRecorders;
  }

  public static get keyboardListeners(): Array<KeyboardListenerScopeController> {
    return InputEventService.#keyboardListeners;
  }

  public static get keyboardRecorders(): Array<KeyboardRecorderScopeController> {
    return InputEventService.#keyboardRecorders;
  }

  public static get mouseListeners(): Array<MouseListenerScopeController> {
    return InputEventService.#mouseListeners;
  }

  public static get mouseRecorders(): Array<MouseRecorderScopeController> {
    return InputEventService.#mouseRecorders;
  }

  /**
   * @description Determine whether the main listener should be started.
   *
   * @returns Whether the main listener should be started.
   */
  public static get shouldStartMainListener(): boolean {
    return (
      InputEventService.inputListeners.length +
      InputEventService.inputRecorders.length +
      InputEventService.keyboardListeners.length +
      InputEventService.keyboardRecorders.length +
      InputEventService.mouseListeners.length +
      InputEventService.mouseRecorders.length
    ) === 1;
  }

  /**
   * @description Determine whether the main listener should be stopped.
   *
   * @returns Whether the main listener should be stopped.
   */
  public static get shouldStopMainListener(): boolean {
    return (
      InputEventService.inputListeners.length +
      InputEventService.inputRecorders.length +
      InputEventService.keyboardListeners.length +
      InputEventService.keyboardRecorders.length +
      InputEventService.mouseListeners.length +
      InputEventService.mouseRecorders.length
    ) === 0;
  }

  /**
   * @description Handle input events and run declared listeners and recorders accordingly.
   * This function is called by C++ Mouse and Keyboard low-level hooks.
   *
   * @param currentEvent
   */
  public static get mainListener(): (event: InputEvent) => void {
    return InputEventService.#mainListener;
  }

  /**
   * @description Customize the default inspect output (with `console.log`) of a
   * class instance.
   */
  public [Symbol.for('nodejs.util.inspect.custom')](depth: number, inspectOptions: object, inspect: Function) {
    return Inspectable.format(this, depth, inspectOptions, inspect);
  }

}
