import type { KeyInput, KeyState } from "../../../../../core/types";

/**
 * @description A keyboard input event (pressed or released).
 */
export type KeyboardEvent = {

  /**
   * @description The input type of the event.
   */
  type: "keyboard";

  /**
   * @description The timestamp of the event occurrence (in milliseconds).
   */
  timestamp: number;

  /**
   * @description The virtual key code that generated the event.
   *
   * @see [The list of virtual key codes](https://learn.microsoft.com/en-us/windows/win32/inputdev/virtual-key-codes)
   */
  input: KeyInput;

  /**
   * @description The key state (either `down` if pressed or `up` if released).
   */
  state: KeyState;

  /**
   * @description Whether the event is suppressed or not. If `true`, the input
   * will not be transmitted to other processes, as if it never happened.
   */
  isSuppressed: boolean;
};
