import {
  MouseInput,
  MouseState,
  Position,
} from "../../../../../core/types";

export type MouseEvent = {
  type: "mouse";
  timestamp: number;
  input: MouseInput;
  state: MouseState;
  position: Position;
  isSuppressed: boolean;
};
