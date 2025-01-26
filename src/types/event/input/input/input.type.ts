import { CaseInsensitiveKey } from "../../../key/key.type";
import { MouseInput } from "../../mouse/mouse-input/mouse-input.type";

export type Input<T extends string = any> = MouseInput | CaseInsensitiveKey<T>;
