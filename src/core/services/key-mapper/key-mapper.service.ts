import { KeyToVirtualKeyCodeMap } from "../../../core/data";
import { KeyFormatter } from "../../../core/services";
import type { CaseInsensitiveKey, KeyCode } from "../../../core/types";

export class KeyMapper {

  constructor() { }

  static toKeyCode<T extends string>(key: CaseInsensitiveKey<T>): KeyCode {
    const formattedKey = KeyFormatter.format(key);
    return KeyToVirtualKeyCodeMap[formattedKey];
  }

}
