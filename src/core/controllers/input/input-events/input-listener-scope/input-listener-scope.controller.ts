import {
  startInputEventListener,
} from "../../../../../addon";
import { InputListenerController, LifecycleController } from "../../../../../core/controllers";
import { InputEventService } from "../../../../../core/services";
import type {
  InputAction,
  InputListener,
  InputListenerOptions,
} from "../../../../../core/types";
import { Inspectable } from "../../../../../core/utilities";

export class InputListenerScopeController {

  #inputActions: InputAction[];
  #inputListener: InputListener;
  #inputListenerController: InputListenerController;
  #isPaused: boolean;
  #currentRunners: number;
  #shouldIgnoreInjectedInputEvents: boolean;

  public constructor(
    inputListener: InputListener,
    inputActions: InputAction[],
    inputListenerOptions?: InputListenerOptions,
  ) {
    this.#inputListener = inputListener;
    this.#inputListenerController = new InputListenerController(this);
    this.#inputActions = inputActions;
    this.#isPaused = false;
    this.#currentRunners = 0;
    this.#shouldIgnoreInjectedInputEvents = inputListenerOptions?.ignoreInjected ?? false;
    InputEventService.inputListeners.push(this);
    if (InputEventService.shouldStartMainListener) {
      LifecycleController.cleanBeforeExit();
      startInputEventListener(InputEventService.mainListener);
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
    return this.#inputListener;
  }

  public get listenerController() {
    return this.#inputListenerController;
  }

  public get when() {
    return this.#inputActions;
  }

  /**
   * @description Customize the default inspect output (with `console.log`) of a
   * class instance.
   */
  public [Symbol.for('nodejs.util.inspect.custom')](depth: number, inspectOptions: object, inspect: Function) {
    return Inspectable.format(this, depth, inspectOptions, inspect);
  }

}
