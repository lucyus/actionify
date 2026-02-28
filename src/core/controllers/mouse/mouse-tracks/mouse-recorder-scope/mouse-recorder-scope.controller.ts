import { WriteStream } from "fs";
import {
  startInputEventListener,
} from "../../../../../addon";
import { LifecycleController, MouseRecorderController } from "../../../../../core/controllers";
import { InputEventService } from "../../../../../core/services";
import type { MouseAction, MouseRecorderOptions } from "../../../../../core/types";
import { Inspectable } from "../../../../../core/utilities";

export class MouseRecorderScopeController {

  #mouseActions: MouseAction[];
  #writeStream: WriteStream;
  #isPaused: boolean;
  #mouseRecorderController: MouseRecorderController;
  #shouldIgnoreInjectedInputEvents: boolean;

  public constructor(
    mouseActions: MouseAction[],
    writeStream: WriteStream,
    mouseRecorderOptions?: MouseRecorderOptions,
  ) {
    this.#mouseActions = mouseActions;
    this.#writeStream = writeStream;
    this.#isPaused = false;
    this.#mouseRecorderController = new MouseRecorderController(this);
    this.#shouldIgnoreInjectedInputEvents = mouseRecorderOptions?.ignoreInjected ?? false;
    InputEventService.mouseRecorders.push(this);
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

  public get recorderController() {
    return this.#mouseRecorderController;
  }

  public get when() {
    return this.#mouseActions;
  }

  public get writeStream() {
    return this.#writeStream;
  }

  /**
   * @description Customize the default inspect output (with `console.log`) of a
   * class instance.
   */
  public [Symbol.for('nodejs.util.inspect.custom')](depth: number, inspectOptions: object, inspect: Function) {
    return Inspectable.format(this, depth, inspectOptions, inspect);
  }

}
