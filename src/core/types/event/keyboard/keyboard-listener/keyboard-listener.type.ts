import { KeyboardListenerController } from "../../../../../core/controllers";
import type { KeyboardEvent } from "../../../../../core/types";

export type KeyboardListener = (
  keyboardEvent: KeyboardEvent,
  keyboardListenerController: KeyboardListenerController
) => void | Promise<void>;
