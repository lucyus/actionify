import { MouseAction } from "../mouse-action/mouse-action.type";
import { MouseListener } from "../mouse-listener/mouse-listener.type";

export type MouseListenerScope = {
  type: "mouse";
  listener: MouseListener;
  when: MouseAction[];
  isPaused: boolean;
  isRunning: boolean;
};
