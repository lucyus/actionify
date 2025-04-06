import type { Key } from "../../../core/types";
import { KeyValidator } from "../../../core/validators";

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
