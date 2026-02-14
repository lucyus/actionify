import { WriteStream } from "fs";
import {
  startEventListener,
} from "../../../../../addon";
import { InputRecorderController, LifecycleController } from "../../../../../core/controllers";
import { InputEventService } from "../../../../../core/services";
import type { InputAction, InputRecorderOptions } from "../../../../../core/types";
import { Inspectable } from "../../../../../core/utilities";

export class InputRecorderScopeController {

  #inputActions: InputAction[];
  #writeStream: WriteStream;
  #isPaused: boolean;
  #inputRecorderController: InputRecorderController;
  #shouldIgnoreInjectedInputEvents: boolean;

  public constructor(
    inputActions: InputAction[],
    writeStream: WriteStream,
    inputRecorderOptions?: InputRecorderOptions,
  ) {
    this.#inputActions = inputActions;
    this.#writeStream = writeStream;
    this.#isPaused = false;
    this.#inputRecorderController = new InputRecorderController(this);
    this.#shouldIgnoreInjectedInputEvents = inputRecorderOptions?.ignoreInjected ?? false;
    InputEventService.inputRecorders.push(this);
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

  public get recorderController() {
    return this.#inputRecorderController;
  }

  public get when() {
    return this.#inputActions;
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
