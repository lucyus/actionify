import { KeyToVirtualKeyCodeMap } from "../../../core/data";
import type { Key } from "../../../core/types";

export class KeyValidator {

  constructor() { }

  static isKey(value: string): value is Key {
    return value in KeyToVirtualKeyCodeMap;
  }

}
