import { KeyInput } from "../key-input/key-input.type";
import { KeyState } from "../key-state/key-state.type";

export type KeyAction = {
  input: KeyInput;
  state?: KeyState;
};
