import { KeyToVirtualKeyCodeMap } from "../../data/key-to-virtual-key-code.map";
import { KeyCode } from "../../types/key-code/key-code.type";
import { CaseInsensitiveKey } from "../../types/key/key.type";
import { KeyFormatter } from "../key-formatter/key-formatter.service";

export class KeyMapper {

  constructor() { }

  static toKeyCode<T extends string>(key: CaseInsensitiveKey<T>): KeyCode {
    const formattedKey = KeyFormatter.format(key);
    return KeyToVirtualKeyCodeMap[formattedKey];
  }

}
