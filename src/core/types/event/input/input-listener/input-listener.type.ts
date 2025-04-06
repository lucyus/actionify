import { InputListenerController } from "../../../../../core/controllers";
import type { KeyboardEvent, MouseEvent } from "../../../../../core/types";

export type InputListener = (
  event: MouseEvent | KeyboardEvent,
  inputListenerController: InputListenerController
) => void | Promise<void>;
