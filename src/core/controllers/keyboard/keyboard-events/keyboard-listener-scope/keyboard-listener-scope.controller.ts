import {
  startEventListener,
} from "../../../../../addon";
import { KeyboardListenerController, LifecycleController } from "../../../../../core/controllers";
import { InputEventService } from "../../../../../core/services";
import type { KeyAction, KeyboardListener, KeyboardListenerOptions } from "../../../../../core/types";
import { Inspectable } from "../../../../../core/utilities";

export class KeyboardListenerScopeController {

  #keyboardActions: KeyAction[];
  #keyboardListener: KeyboardListener;
  #keyboardListenerController: KeyboardListenerController;
  #isPaused: boolean;
  #currentRunners: number;
  #shouldIgnoreInjectedInputEvents: boolean;


  public constructor(
    keyboardListener: KeyboardListener,
    keyboardActions: KeyAction[],
    keyboardListenerOptions?: KeyboardListenerOptions,
  ) {
    this.#keyboardListener = keyboardListener;
    this.#keyboardListenerController = new KeyboardListenerController(this);
    this.#keyboardActions = keyboardActions;
    this.#isPaused = false;
    this.#currentRunners = 0;
    this.#shouldIgnoreInjectedInputEvents = keyboardListenerOptions?.ignoreInjected ?? false;
    InputEventService.keyboardListeners.push(this);
    if (InputEventService.shouldStartMainListener) {
      LifecycleController.cleanBeforeExit();
      startEventListener(InputEventService.mainListener);
    }
  }

  public get ignoreInjected() {
    return this.#shouldIgnoreInjectedInputEvents;
  }

  public set ignoreInjected(ignoreInjected: boolean) {
    this.#shouldIgnoreInjectedInputEvents = ignoreInjected;
  }

  public get isPaused() {
    return this.#isPaused;
  }

  public set isPaused(isPaused: boolean) {
    this.#isPaused = isPaused;
  }

  public get isRunning() {
    return this.#currentRunners > 0;
  }

  public get currentRunners() {
    return this.#currentRunners;
  }

  public set currentRunners(currentRunners: number) {
    this.#currentRunners = currentRunners;
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
