import { KeyToVirtualKeyCodeMap } from "../../data/key-to-virtual-key-code.map";

type KeyToVirtualKeyCodeMapType = typeof KeyToVirtualKeyCodeMap;

export type KeyCode = KeyToVirtualKeyCodeMapType[keyof KeyToVirtualKeyCodeMapType];
