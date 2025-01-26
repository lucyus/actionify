import { WriteStream } from "fs";
import { MouseAction } from "../mouse-action/mouse-action.type";

export type MouseRecorderScope = {
  type: "mouse";
  when: MouseAction[];
  writeStream: WriteStream;
  isPaused: boolean;
};
