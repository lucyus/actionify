import type { WindowEvent } from "../../../../../core/types";
import { WindowListenerController } from "../../../../../core/controllers";

export type WindowListener = (
  windowEvent: WindowEvent,
  windowListenerController: WindowListenerController
) => void | Promise<void>;
