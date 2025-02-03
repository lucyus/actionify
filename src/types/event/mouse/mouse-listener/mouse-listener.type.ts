import { MouseEvent } from "../mouse-event/mouse-event.type";
import { MouseListenerController } from "../mouse-listener-controller/mouse-listener-controller.type";

export type MouseListener = (
  mouseEvent: MouseEvent,
  mouseListenerController: MouseListenerController
) => void | Promise<void>;
