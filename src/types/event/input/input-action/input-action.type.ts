import { KeyAction } from "../../keyboard/key-action/key-action.type";
import { MouseAction } from "../../mouse/mouse-action/mouse-action.type";

export type InputAction = (MouseAction & { type: "mouse" }) | (KeyAction & { type: "keyboard" });
