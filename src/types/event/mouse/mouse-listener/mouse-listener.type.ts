import { MouseEvent } from "../mouse-event/mouse-event.type";

export type MouseListener = (mouseEvent: MouseEvent) => void | Promise<void>;
