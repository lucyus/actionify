import { WindowInteractionController } from "../../../../core/controllers";
import type { WindowEventType, WindowInfo } from "../../../../core/types";

export type WindowEvent = {
    type: Exclude<WindowEventType, "destroy">;
    window: WindowInteractionController;
  }
  |
  {
    type: "destroy";
    window: WindowInfo;
  }
;
