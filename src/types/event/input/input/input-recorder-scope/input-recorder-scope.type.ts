import { WriteStream } from "fs";
import { InputAction } from "../../input-action/input-action.type";

export type InputRecorderScope = {
  when: InputAction[];
  writeStream: WriteStream;
  isPaused: boolean;
};
