import { startWindowEventListener } from '../../../../../addon';
import {
  LifecycleController,
  WindowListenerController
} from '../../../../../core/controllers';
import { WindowEventService } from '../../../../../core/services';
import type {
  WindowEventType,
  WindowFilter,
  WindowListener,
  WindowListenerOptions,
} from '../../../../../core/types';
import { Inspectable } from '../../../../../core/utilities';

export class WindowListenerScopeController {

  #windowEventTypes: WindowEventType[];
  #windowListener: WindowListener;
  #windowListenerController: WindowListenerController;
  #isPaused: boolean;
  #currentRunners: number;
  #shouldListen?: WindowFilter;

  public constructor(
    windowListener: WindowListener,
    windowEventTypes: WindowEventType[],
    windowListenerOptions?: WindowListenerOptions,
  ) {
    this.#windowListener = windowListener;
    this.#windowListenerController = new WindowListenerController(this);
    this.#windowEventTypes = windowEventTypes;
    this.#isPaused = false;
    this.#currentRunners = 0;
    this.#shouldListen = windowListenerOptions?.shouldListen;
    WindowEventService.windowListeners.push(this);
    if (WindowEventService.shouldStartMainWindowEventListener) {
      LifecycleController.cleanBeforeExit();
      WindowEventService.initializeWindowHistory();
      startWindowEventListener(WindowEventService.mainWindowEventListener);
    }
  }

  public get isPaused(): boolean {
    return this.#isPaused;
  }

  public set isPaused(isPaused: boolean) {
    this.#isPaused = isPaused;
  }

  public get isRunning(): boolean {
    return this.#currentRunners > 0;
  }

  public get currentRunners(): number {
    return this.#currentRunners;
  }

  public set currentRunners(currentRunners: number) {
    this.#currentRunners = currentRunners;
  }

  public get listener(): WindowListener {
    return this.#windowListener;
  }

  public get listenerController(): WindowListenerController {
    return this.#windowListenerController;
  }

  public get when(): WindowEventType[] {
    return this.#windowEventTypes;
  }

  public get shouldListen(): WindowFilter | undefined {
    return this.#shouldListen;
  }

  public set shouldListen(shouldListen: WindowFilter | undefined) {
    this.#shouldListen = shouldListen;
  }

  /**
   * @description Customize the default inspect output (with `console.log`) of a
   * class instance.
   */
  public [Symbol.for('nodejs.util.inspect.custom')](depth: number, inspectOptions: object, inspect: Function) {
    return Inspectable.format(this, depth, inspectOptions, inspect);
  }

}
