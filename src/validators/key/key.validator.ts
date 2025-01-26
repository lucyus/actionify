import { KeyToVirtualKeyCodeMap } from "../../data/key-to-virtual-key-code.map";
import { Key } from "../../types/key/key.type";

export class KeyValidator {

  constructor() { }

  static isKey(value: string): value is Key {
    return value in KeyToVirtualKeyCodeMap;
  }

}
