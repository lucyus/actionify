import { WriteStream } from "fs";
import { KeyAction } from "../key-action/key-action.type";

export type KeyboardRecorderScope = {
  type: "keyboard";
  when: KeyAction[];
  writeStream: WriteStream;
  isStarted: boolean;
  isPaused: boolean;
};
