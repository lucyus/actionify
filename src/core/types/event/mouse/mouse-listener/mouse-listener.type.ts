import { MouseListenerController } from "../../../../../core/controllers";
import { MouseEvent } from "../../../../../core/types";

export type MouseListener = (
  mouseEvent: MouseEvent,
  mouseListenerController: MouseListenerController
) => void | Promise<void>;
