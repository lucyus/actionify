import { InputAction } from "../input-action/input-action.type";
import { InputListener } from "../input-listener/input-listener.type";

export type InputListenerScope = {
  listener: InputListener;
  when: InputAction[];
  isPaused: boolean;
  isRunning: boolean;
};
