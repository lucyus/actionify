import { WriteStream } from "fs";
import {
  startEventListener,
} from "../../../../../addon";
import { LifecycleController, MouseRecorderController } from "../../../../../core/controllers";
import { InputEventService } from "../../../../../core/services";
import type { MouseAction } from "../../../../../core/types";
import { Inspectable } from "../../../../../core/utilities";

export class MouseRecorderScopeController {

  #mouseActions: MouseAction[];
  #writeStream: WriteStream;
  #isPaused: boolean;
  #mouseRecorderController: MouseRecorderController;

  public constructor(
    mouseActions: MouseAction[],
    writeStream: WriteStream
  ) {
    this.#mouseActions = mouseActions;
    this.#writeStream = writeStream;
    this.#isPaused = false;
    this.#mouseRecorderController = new MouseRecorderController(this);
    InputEventService.mouseRecorders.push(this);
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
