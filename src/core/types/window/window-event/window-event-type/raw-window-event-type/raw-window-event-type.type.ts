import type { WindowEventType } from "../../../../../../core/types";

export type RawWindowEventType = WindowEventType
  | "locationchange" // OS-generated
;
