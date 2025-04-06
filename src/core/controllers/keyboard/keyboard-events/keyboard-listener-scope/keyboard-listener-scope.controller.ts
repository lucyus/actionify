import {
  startEventListener,
} from "../../../../../addon";
import { KeyboardListenerController, LifecycleController } from "../../../../../core/controllers";
import { InputEventService } from "../../../../../core/services";
import type { KeyAction, KeyboardListener } from "../../../../../core/types";
import { Inspectable } from "../../../../../core/utilities";

export class KeyboardListenerScopeController {

  #keyboardActions: KeyAction[];
  #keyboardListener: KeyboardListener;
  #keyboardListenerController: KeyboardListenerController;
  #isPaused: boolean = false;
  #isRunning: boolean = false;


  public constructor(
    keyboardListener: KeyboardListener,
    keyboardActions: KeyAction[],
  ) {
    this.#keyboardListener = keyboardListener;
    this.#keyboardListenerController = new KeyboardListenerController(this);
    this.#keyboardActions = keyboardActions;
    this.#isPaused = false;
    this.#isRunning = false;
    InputEventService.keyboardListeners.push(this);
    if (InputEventService.shouldStartMainListener) {
      LifecycleController.cleanBeforeExit();
      startEventListener(InputEventService.mainListener);
    }
  }

  public get isPaused() {
    return this.#isPaused;
  }

  public set isPaused(isPaused: boolean) {
    this.#isPaused = isPaused;
  }

  public get isRunning() {
    return this.#isRunning;
  }

  public set isRunning(isRunning: boolean) {
    this.#isRunning = isRunning;
  }

  public get listener() {
    return this.#keyboardListener;
  }

  public get listenerController() {
    return this.#keyboardListenerController;
  }

  public get when() {
    return this.#keyboardActions;
  }

  /**
   * @description Customize the default inspect output (with `console.log`) of a
   * class instance.
   */
  public [Symbol.for('nodejs.util.inspect.custom')](depth: number, inspectOptions: object, inspect: Function) {
    return Inspectable.format(this, depth, inspectOptions, inspect);
  }

}
