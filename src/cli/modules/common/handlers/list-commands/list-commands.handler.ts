import { CliController } from "../../../../../cli/modules/common/controllers";
import type { Command, CommandWithAscendants } from "../../../../../cli/modules/common/types";

export const ListCommandsHandler: Command["handler"] = async (
  command: CommandWithAscendants,
  args: string[],
  controller: CliController
) => {
  controller.listCommands(command);
  return 0;
};
