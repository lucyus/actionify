import { KeyToKeySymCodeMap, KeyToVirtualKeyCodeMap } from "../../../core/data";
import { OperatingSystemService } from "../../../core/services";
import type { Key } from "../../../core/types";

export class KeyValidator {

  constructor() { }

  static isKey(value: string): value is Key {
    switch (OperatingSystemService.platform) {
      case "win32":
        return value in KeyToVirtualKeyCodeMap;
      case "linux":
        return value in KeyToKeySymCodeMap;
      default:
        throw new Error(`Unsupported platform: ${OperatingSystemService.platform}`);
    }
  }

}
