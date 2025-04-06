import {
  startEventListener,
} from "../../../../../addon";
import { LifecycleController, MouseListenerController } from "../../../../../core/controllers";
import { InputEventService } from "../../../../../core/services";
import type { MouseAction, MouseListener } from "../../../../../core/types";
import { Inspectable } from "../../../../../core/utilities";

export class MouseListenerScopeController {

  #mouseActions: MouseAction[];
  #mouseListener: MouseListener;
  #mouseListenerController: MouseListenerController;
  #isPaused: boolean;
  #isRunning: boolean;

  public constructor(
    mouseListener: MouseListener,
    mouseActions: MouseAction[],
  ) {
    this.#mouseListener = mouseListener;
    this.#mouseListenerController = new MouseListenerController(this);
    this.#mouseActions = mouseActions;
    this.#isPaused = false;
    this.#isRunning = false;
    InputEventService.mouseListeners.push(this);
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
