import { WriteStream } from "fs";
import {
  startEventListener,
} from "../../../../../addon";
import { KeyboardRecorderController, LifecycleController } from "../../../../../core/controllers";
import { InputEventService } from "../../../../../core/services";
import type { KeyAction } from "../../../../../core/types";
import { Inspectable } from "../../../../../core/utilities";

export class KeyboardRecorderScopeController {

  #keyboardActions: KeyAction[];
  #writeStream: WriteStream;
  #isPaused: boolean;
  #keyboardRecorderController: KeyboardRecorderController;

  public constructor(
    keyboardActions: KeyAction[],
    writeStream: WriteStream
  ) {
    this.#keyboardActions = keyboardActions;
    this.#writeStream = writeStream;
    this.#isPaused = false;
    this.#keyboardRecorderController = new KeyboardRecorderController(this);
    InputEventService.keyboardRecorders.push(this);
    if(InputEventService.shouldStartMainListener) {
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

  public get recorderController() {
    return this.#keyboardRecorderController;
  }

  public get when() {
    return this.#keyboardActions;
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
