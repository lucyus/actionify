import { KeyboardEvent } from "../../keyboard/keyboard-event/keyboard-event.type";
import { MouseEvent } from "../../mouse/mouse-event/mouse-event.type";

export type InputListener = (event: MouseEvent | KeyboardEvent) => void | Promise<void>;
