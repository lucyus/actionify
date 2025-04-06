import {
  InputEventsController,
  InputTracksController,
} from "../../../core/controllers";
import { Inspectable } from "../../../core/utilities";

/**
 * @description Global input operations.
 */
export class InputController {

  #inputEventsController: InputEventsController;
  #inputTracksController: InputTracksController;

  public constructor() {
    this.#inputEventsController = new InputEventsController();
    this.#inputTracksController = new InputTracksController();
  }

  /**
   * @description Input events listening manager.
   */
  public get events(): InputEventsController {
    return this.#inputEventsController;
  }

  /**
   * @description Input events recorder and replayer.
   */
  public get track(): InputTracksController {
    return this.#inputTracksController;
  }

  /**
   * @description Customize the default inspect output (with `console.log`) of a
   * class instance.
   */
  public [Symbol.for('nodejs.util.inspect.custom')](depth: number, inspectOptions: object, inspect: Function) {
    return Inspectable.format(this, depth, inspectOptions, inspect);
  }

}
