import { stopWindowEventListener } from "../../../../../../addon";
import { WindowListenerScopeController } from "../../../../../../core/controllers";
import { IWindowListenerController } from "../../../../../../core/interfaces";
import { WindowEventService } from "../../../../../../core/services";
import { Inspectable } from "../../../../../../core/utilities";

export class WindowListenerController implements IWindowListenerController {

  #windowListenerScopeController: WindowListenerScopeController;

  public constructor(
    windowListenerScopeController: WindowListenerScopeController
  ) {
    this.#windowListenerScopeController = windowListenerScopeController;
  }

  public pause() {
    this.#windowListenerScopeController.isPaused = true;
    return this;
  }

  public resume() {
    this.#windowListenerScopeController.isPaused = false;
    return this;
  }

  public off() {
    const listenerIndex = WindowEventService.windowListeners.findIndex((windowListener) => windowListener.listener === this.#windowListenerScopeController.listener);
    if (listenerIndex !== -1) {
      WindowEventService.windowListeners.splice(listenerIndex, 1);
    }
    if (WindowEventService.shouldStopMainWindowEventListener) {
      stopWindowEventListener();
      WindowEventService.clearWindowHistory();
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
