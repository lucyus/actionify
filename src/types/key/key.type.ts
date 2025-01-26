import { KeyToVirtualKeyCodeMap } from "../../data/key-to-virtual-key-code.map"
import { IgnoreWhitespace } from "../ignore-whitespace/ignore-whitespace.type";

export type Key = keyof typeof KeyToVirtualKeyCodeMap;
export type CaseInsensitiveKey<T extends string = string> = IgnoreWhitespace<Lowercase<T>> extends Key
    ? T
    : (
        IgnoreWhitespace<T> extends "" // exception for the spacebar key
        ? T
        : Key
    )
;
