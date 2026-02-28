import {
  startInputEventListener,
} from "../../../../../addon";
import { LifecycleController, MouseListenerController } from "../../../../../core/controllers";
import { InputEventService } from "../../../../../core/services";
import type {
  MouseAction,
  MouseListener,
  MouseListenerOptions,
} from "../../../../../core/types";
import { Inspectable } from "../../../../../core/utilities";

export class MouseListenerScopeController {

  #mouseActions: MouseAction[];
  #mouseListener: MouseListener;
  #mouseListenerController: MouseListenerController;
  #isPaused: boolean;
  #currentRunners: number;
  #shouldIgnoreInjectedInputEvents: boolean;

  public constructor(
    mouseListener: MouseListener,
    mouseActions: MouseAction[],
    mouseListenerOptions?: MouseListenerOptions,
  ) {
    this.#mouseListener = mouseListener;
    this.#mouseListenerController = new MouseListenerController(this);
    this.#mouseActions = mouseActions;
    this.#isPaused = false;
    this.#currentRunners = 0;
    this.#shouldIgnoreInjectedInputEvents = mouseListenerOptions?.ignoreInjected ?? false;
    InputEventService.mouseListeners.push(this);
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
    return this.#mouseListener;
  }

  public get listenerController() {
    return this.#mouseListenerController;
  }

  public get when() {
    return this.#mouseActions;
  }

  /**
   * @description Customize the default inspect output (with `console.log`) of a
   * class instance.
   */
  public [Symbol.for('nodejs.util.inspect.custom')](depth: number, inspectOptions: object, inspect: Function) {
    return Inspectable.format(this, depth, inspectOptions, inspect);
  }

}
