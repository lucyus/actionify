import { KeyboardEvent } from "../../keyboard/keyboard-event/keyboard-event.type";
import { MouseEvent } from "../../mouse/mouse-event/mouse-event.type";
import { InputListenerController } from "../input-listener-controller/input-listener-controller.type";

export type InputListener = (
  event: MouseEvent | KeyboardEvent,
  inputListenerController: InputListenerController
) => void | Promise<void>;
