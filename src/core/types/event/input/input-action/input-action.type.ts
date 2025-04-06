import type { KeyAction, MouseAction } from "../../../../../core/types";

export type InputAction = (MouseAction & { type: "mouse" }) | (KeyAction & { type: "keyboard" });
