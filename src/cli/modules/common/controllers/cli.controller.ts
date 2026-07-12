import path from "path";
import { CommandHelper } from "../../../../cli/modules/common/helpers";
import { CliRegistry } from "../../../../cli/modules/common/registries";
import type { Command, CommandWithAscendants } from "../../../../cli/modules/common/types";

export abstract class CliController {

  public cliRegistry: CliRegistry;
  public cliOutput: Console;
  public cliName: string;

  public constructor(commands: Command[]) {
    this.cliOutput = console;
    this.cliRegistry = new CliRegistry(commands);
    this.cliName = `npx ${path.basename(process.argv[1])}`;
  }

  public async run(): Promise<number> {
    try {
      const args = process.argv.slice(2);
      if (args.length === 0) {
        return this._noArgsHandler();
      }
      const maybeCommand = this.cliRegistry.resolve(...args);
      if (!maybeCommand) {
        return this._notFoundHandler(...args);
      }
      const command = maybeCommand;
      return command.handler(command, process.argv.slice(2), this);
    }
    catch (error) {
      this.cliOutput.error(error);
      return 1;
    }
  }

  public listCommands(command?: CommandWithAscendants): void {
    const leaves = command ? this.cliRegistry.leavesOf(command, command.ascendants) : this.cliRegistry.leaves();
    const leavesFullNames = [];
    let maxFullNameLength = 0;
    for (const leaf of leaves) {
      const leafFullName = CommandHelper.fullName(leaf);
      leavesFullNames.push(leafFullName);
      maxFullNameLength = Math.max(maxFullNameLength, leafFullName.length);
    }

    this.cliOutput.info();
    this.cliOutput.info("Commands:");
    for (let index = 0; index < leaves.length; index++) {
      const leaf = leaves[index];
      const leafFullName = leavesFullNames[index];
      this.cliOutput.info(`  • ${this.cliName} ${leafFullName.padEnd(maxFullNameLength)}   | ${leaf.description}`);
    }
  }

  protected _notFoundHandler(...args: string[]): number | Promise<number> {
    this.cliOutput.error(`Error: Command not found: ${this.cliName} ${args.join(" ")}`);
    return 1;
  }

  protected abstract _noArgsHandler(...args: string[]): number | Promise<number>;

}
