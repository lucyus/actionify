import { KeyboardEvent } from "../keyboard-event/keyboard-event.type";

export type KeyboardListener = (KeyboardEvent: KeyboardEvent) => void | Promise<void>;
