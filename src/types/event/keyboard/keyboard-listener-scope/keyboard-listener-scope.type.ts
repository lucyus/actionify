import { KeyAction } from "../key-action/key-action.type";
import { KeyboardListener } from "../keyboard-listener/keyboard-listener.type";

export type KeyboardListenerScope = {
  type: "keyboard";
  listener: KeyboardListener;
  when: KeyAction[];
  isPaused: boolean;
  isRunning: boolean;
};
