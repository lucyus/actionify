import {
  stopEventListener,
} from "../../../../../../addon";
import { InputListenerScopeController } from "../../../../../../core/controllers";
import { IInputListenerController } from "../../../../../../core/interfaces";
import { InputEventService } from "../../../../../../core/services";
import { Inspectable } from "../../../../../../core/utilities";

export class InputListenerController implements IInputListenerController {

  #inputListenerScopeController: InputListenerScopeController;

  public constructor(
    inputListenerScopeController: InputListenerScopeController
  ) {
    this.#inputListenerScopeController = inputListenerScopeController;
  }

  public pause() {
    this.#inputListenerScopeController.isPaused = true;
    return this;
  }

  public resume() {
    this.#inputListenerScopeController.isPaused = false;
    return this;
  }

  public off() {
    const listenerIndex = InputEventService.inputListeners.findIndex((inputListener) => inputListener.listener === this.#inputListenerScopeController.listener);
    if (listenerIndex !== -1) {
      InputEventService.inputListeners.splice(listenerIndex, 1);
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
