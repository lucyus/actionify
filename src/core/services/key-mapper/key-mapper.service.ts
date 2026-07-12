import { KeyToKeySymCodeMap, KeyToVirtualKeyCodeMap } from "../../../core/data";
import { KeyFormatter, OperatingSystemService } from "../../../core/services";
import type { CaseInsensitiveKey, KeyCode } from "../../../core/types";

export class KeyMapper {

  constructor() { }

  static toKeyCode<T extends string>(key: CaseInsensitiveKey<T>): KeyCode {
    const formattedKey = KeyFormatter.format(key);
    switch (OperatingSystemService.platform) {
      case "win32":
        return KeyToVirtualKeyCodeMap[formattedKey];
      case "linux":
        return KeyToKeySymCodeMap[formattedKey];
      default:
        throw new Error(`Unsupported platform: ${OperatingSystemService.platform}`);
    }
  }

}
