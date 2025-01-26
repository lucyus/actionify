import { Position } from "../../../position/position.type";
import { MouseInput } from "../mouse-input/mouse-input.type";
import { MouseState } from "../mouse-state/mouse-state.type";

export type MouseEvent = {
  type: "mouse";
  timestamp: number;
  input: MouseInput;
  state: MouseState;
  position: Position;
};
