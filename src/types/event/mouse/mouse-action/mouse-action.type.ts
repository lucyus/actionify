import { MouseInput } from "../mouse-input/mouse-input.type";
import { MouseState } from "../mouse-state/mouse-state.type";

export type MouseAction = {
  input: MouseInput;
  state?: MouseState;
};
