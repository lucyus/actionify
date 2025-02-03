import { KeyInput } from "../key-input/key-input.type";
import { KeyState } from "../key-state/key-state.type";

export type KeyboardEvent = {
  type: "keyboard";
  timestamp: number;
  input: KeyInput;
  state: KeyState;
  isSuppressed: boolean;
};
