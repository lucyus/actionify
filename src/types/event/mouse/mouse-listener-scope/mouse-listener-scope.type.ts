import { MouseAction } from "../mouse-action/mouse-action.type";
import { MouseListenerController } from "../mouse-listener-controller/mouse-listener-controller.type";
import { MouseListener } from "../mouse-listener/mouse-listener.type";

export type MouseListenerScope = {
  type: "mouse";
  listener: MouseListener;
  controller: MouseListenerController;
  when: MouseAction[];
  isPaused: boolean;
  isRunning: boolean;
};
