import {
  stopEventListener,
} from "../../../../../../addon";
import { MouseListenerScopeController } from "../../../../../../core/controllers";
import { IMouseListenerController } from "../../../../../../core/interfaces";
import { InputEventService } from "../../../../../../core/services";
import { Inspectable } from "../../../../../../core/utilities";

export class MouseListenerController implements IMouseListenerController {

  #mouseListenerScopeController: MouseListenerScopeController;

  public constructor(
    mouseListenerScopeController: MouseListenerScopeController
  ) {
    this.#mouseListenerScopeController = mouseListenerScopeController;
  }

  public pause() {
    this.#mouseListenerScopeController.isPaused = true;
    return this;
  }

  public resume() {
    this.#mouseListenerScopeController.isPaused = false;
    return this;
  }

  public off() {
    const listenerIndex = InputEventService.mouseListeners.findIndex((mouseListener) => mouseListener.listener === this.#mouseListenerScopeController.listener);
    if (listenerIndex !== -1) {
      InputEventService.mouseListeners.splice(listenerIndex, 1);
    }
    if (InputEventService.shouldStopMainListener) {
      stopEventListener();
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
