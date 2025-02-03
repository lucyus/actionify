import { KeyAction } from "../key-action/key-action.type";
import { KeyboardListenerController } from "../keyboard-listener-controller/keyboard-listener-controller.type";
import { KeyboardListener } from "../keyboard-listener/keyboard-listener.type";

export type KeyboardListenerScope = {
  type: "keyboard";
  listener: KeyboardListener;
  controller: KeyboardListenerController;
  when: KeyAction[];
  isPaused: boolean;
  isRunning: boolean;
};
