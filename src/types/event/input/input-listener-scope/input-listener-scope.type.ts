import { InputAction } from "../input-action/input-action.type";
import { InputListenerController } from "../input-listener-controller/input-listener-controller.type";
import { InputListener } from "../input-listener/input-listener.type";

export type InputListenerScope = {
  listener: InputListener;
  controller: InputListenerController;
  when: InputAction[];
  isPaused: boolean;
  isRunning: boolean;
};
