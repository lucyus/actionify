import { CliController } from "../../../../cli/modules/common/controllers";
import { CommandHelper } from "../../../../cli/modules/common/helpers";
import type { Command, CommandWithAscendants } from "../../../../cli/modules/common/types";
import { VersionHandler } from "../version";

export const HelpHandler: Command["handler"] = async (
  command: CommandWithAscendants,
  args: string[],
  controller: CliController
) => {
  await VersionHandler(command, args, controller);
  controller.listCommands();
  return 0;
};
