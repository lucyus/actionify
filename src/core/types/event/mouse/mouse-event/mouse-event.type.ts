import {
  MouseInput,
  MouseState,
  Position,
} from "../../../../../core/types";

/**
 * @description A mouse input event (pressed, released, moved or scrolled).
 */
export type MouseEvent = {

  /**
   * @description The input type of the event.
   */
  type: "mouse";

  /**
   * @description The timestamp of the event occurrence (in milliseconds).
   */
  timestamp: number;

  /**
   * @description The mouse input (movement, button or scroll) that generated the event.
   */
  input: MouseInput;

  /**
   * @description The state of the mouse input (`down` for pressed, `up` for released and `neutral` for movement).
   */
  state: MouseState;

  /**
   * @description The position of the mouse cursor when the event occurred.
   */
  position: Position;

  /**
   * @description Whether the event is suppressed or not. If `true`, the input
   * will not be transmitted to other processes, as if it never happened.
   */
  isSuppressed: boolean;
};
