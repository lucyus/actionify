import type { KeyInput, KeyState } from "../../../../../core/types";

export type KeyAction = {
  input: KeyInput;
  state?: KeyState;
};
