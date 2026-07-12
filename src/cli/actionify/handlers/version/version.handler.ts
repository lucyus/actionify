import { CliController } from "../../../../cli/modules/common/controllers";
import type { Command, CommandWithAscendants } from "../../../../cli/modules/common/types";
import { version as pkgVersion } from "../../../../../package.json";

export const VersionHandler: Command["handler"] = async (
  command: CommandWithAscendants,
  args: string[],
  controller: CliController
) => {
  controller.cliOutput.info(`
    _        _   _             _  __            ____ _     ___
   / \\   ___| |_(_) ___  _ __ (_)/ _|_   _     / ___| |   |_ _|
  / _ \\ / __| __| |/ _ \\| '_ \\| | |_| | | |   | |   | |    | |
 / ___ \\ (__| |_| | (_) | | | | |  _| |_| |   | |___| |___ | |
/_/   \\_\\___|\\__|_|\\___/|_| |_|_|_|  \\__, |    \\____|_____|___|
                                     |___/

Actionify CLI: ${pkgVersion}
Node: ${process.version}
OS: ${process.platform} ${process.arch}
  `.replace(/^(\r\n|\r|\n)|(\s+)$/g, ""));
  return 0;
};
