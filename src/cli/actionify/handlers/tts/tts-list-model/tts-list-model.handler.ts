import { CliController } from "../../../../../cli/modules/common/controllers";
import type { Command, CommandWithAscendants } from "../../../../../cli/modules/common/types";
import { TtsListRemoteModelHandler } from "../../../handlers";
import { TtsListLocalModelHandler } from "./tts-list-local-model";

export const TtsListModelHandler: Command["handler"] = async (
  command: CommandWithAscendants,
  args: string[],
  controller: CliController
) => {
  if ((await TtsListRemoteModelHandler(command, args, controller)) !== 0) {
    return 1;
  }
  return await TtsListLocalModelHandler(command, args, controller);
};
