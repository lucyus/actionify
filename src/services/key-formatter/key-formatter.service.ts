import { KeyToVirtualKeyCodeMap } from "../../data/key-to-virtual-key-code.map";
import { Key } from "../../types/key/key.type";
import { KeyValidator } from "../../validators/key/key.validator";

export class KeyFormatter {

  constructor() { }

  static format(value: string): Key {
    const formattedValue = value !== " " ? value.toLowerCase().trim().replace(/ /g, "") : value;
    if (!KeyValidator.isKey(formattedValue)) {
      throw new Error(`The "${value}" key does not match any supported Windows key code.`);
    }
    return formattedValue;
  }

}
