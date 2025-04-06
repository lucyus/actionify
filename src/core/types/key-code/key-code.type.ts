import { KeyToVirtualKeyCodeMap } from "../../../core/data";

type KeyToVirtualKeyCodeMapType = typeof KeyToVirtualKeyCodeMap;

export type KeyCode = KeyToVirtualKeyCodeMapType[keyof KeyToVirtualKeyCodeMapType];
