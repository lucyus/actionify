import { KeyboardEvent } from "../keyboard-event/keyboard-event.type";
import { KeyboardListenerController } from "../keyboard-listener-controller/keyboard-listener-controller.type";

export type KeyboardListener = (
  keyboardEvent: KeyboardEvent,
  keyboardListenerController: KeyboardListenerController
) => void | Promise<void>;
