import { CliController } from "../../../../../cli/modules/common/controllers";
import type { CommandWithAscendants } from "../../../../../cli/modules/common/types";

export type Command = {
  name: string;
  description: string;
  options?: string[];
  handler: (
    command: CommandWithAscendants,
    args: string[],
    cliController: CliController,
  ) => number | Promise<number>;
  aliases?: string[];
  subCommands?: Command[];
};
