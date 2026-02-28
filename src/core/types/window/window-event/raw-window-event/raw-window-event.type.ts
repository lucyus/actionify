import type { RawWindowEventType } from "../../../../../core/types";

export type RawWindowEvent = {
  hwnd: number;
  type: RawWindowEventType;
};
