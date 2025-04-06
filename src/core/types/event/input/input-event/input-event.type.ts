import type { InputState } from "../../../../../core/types";

export type InputEvent = {
  type: "mouse" | "keyboard";
  state: InputState;
  timestamp: number;
  isSuppressed: boolean;
};
