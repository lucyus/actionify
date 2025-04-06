import type {
  CaseInsensitiveKey,
  MouseInput
} from "../../../../../core/types";

export type Input<T extends string = any> = MouseInput | CaseInsensitiveKey<T>;
