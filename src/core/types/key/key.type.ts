import { KeyToVirtualKeyCodeMap } from "../../../core/data";
import type { IgnoreWhitespace } from "../../../core/types";

export type Key = keyof typeof KeyToVirtualKeyCodeMap;
export type CaseInsensitiveKey<T extends string = string> = IgnoreWhitespace<Lowercase<T>> extends Key
    ? T
    : (
        IgnoreWhitespace<T> extends "" // exception for the spacebar key
        ? T
        : Key
    )
;
