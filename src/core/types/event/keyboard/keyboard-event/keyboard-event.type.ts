import type { KeyInput, KeyState } from "../../../../../core/types";

export type KeyboardEvent = {
  type: "keyboard";
  timestamp: number;
  input: KeyInput;
  state: KeyState;
  isSuppressed: boolean;
};
