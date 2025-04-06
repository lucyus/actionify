import {
  stopEventListener,
} from "../../../../../../addon";
import { KeyboardListenerScopeController } from "../../../../../../core/controllers";
import { IKeyboardListenerController } from "../../../../../../core/interfaces";
import { InputEventService } from "../../../../../../core/services";
import { Inspectable } from "../../../../../../core/utilities";

export class KeyboardListenerController implements IKeyboardListenerController {

  #keyboardListenerScopeController: KeyboardListenerScopeController;

  public constructor(
    keyboardListenerScopeController: KeyboardListenerScopeController
  ) {
    this.#keyboardListenerScopeController = keyboardListenerScopeController;
  }

  public pause() {
    this.#keyboardListenerScopeController.isPaused = true;
    return this;
  }

  public resume() {
    this.#keyboardListenerScopeController.isPaused = false;
    return this;
  }

  public off() {
    const listenerIndex = InputEventService.keyboardListeners.findIndex((keyboardListener) => keyboardListener.listener === this.#keyboardListenerScopeController.listener);
    if (listenerIndex !== -1) {
      InputEventService.keyboardListeners.splice(listenerIndex, 1);
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
