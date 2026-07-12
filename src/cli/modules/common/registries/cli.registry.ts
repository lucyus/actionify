import type { Command, CommandWithAscendants } from "../../../../cli/modules/common/types";

export class CliRegistry {

  protected _commands: Command[];
  protected _argumentCommandMatcher: (argument: string) => { matching: (command: Command) => boolean };

  public constructor(commands: Command[]) {
    this._argumentCommandMatcher = this._buildArgumentCommandMatcher();
    this._commands = [...commands];
  }

  public resolve(...args: string[]): CommandWithAscendants | undefined {
    for (const command of this._commands) {
      const result = this._resolve(args, command);
      if (result) {
        return result;
      }
    }
  }

  public leaves(): CommandWithAscendants[] {
    const leaves: CommandWithAscendants[] = [];
    for (const command of this._commands) {
      leaves.push(...this.leavesOf(command));
    }
    return leaves;
  }

  public leavesOf(command: Command, parents?: CommandWithAscendants[]): CommandWithAscendants[] {
    const safeParents = parents ?? [];

    if (!command.subCommands || command.subCommands.length === 0) {
      return [{ ...command, ascendants: [...safeParents] }];
    }

    const leaves: CommandWithAscendants[] = [];
    for (const subCommand of command.subCommands) {
      leaves.push(...this.leavesOf(subCommand, [...safeParents, { ...command, ascendants: [...safeParents] }]));
    }
    return leaves;
  }

  public roots(): Command[] {
    return this._commands;
  }

  protected _resolve(args: string[], command: Command, parents?: CommandWithAscendants[]): CommandWithAscendants | undefined {
    const safeParents = parents ?? [];
    const is = this._argumentCommandMatcher;

    if (args.length === 0) {
      return;
    }

    if (args.length === 1) {
      const lastArgument = args[0];
      if (!is(lastArgument).matching(command)) {
        return;
      }
      return { ...command, ascendants: [...safeParents] };
    }

    const intermediateArgument = args[0];
    if (!is(intermediateArgument).matching(command)) {
      return;
    }

    if (!command.subCommands || command.subCommands.length === 0) {
      return;
    }

    for (const subCommand of command.subCommands) {
      const result = this._resolve(args.slice(1), subCommand, [...safeParents, { ...command, ascendants: [...safeParents] }]);
      if (result) {
        return result;
      }
    }

    return;
  }

  protected _buildArgumentCommandMatcher() {
    return (argument: string) => {
      return {
        matching(command: Command) {
          return (
            command.name === argument
            || command.aliases?.includes(argument)
            || /(<.+>)|(\[.+])/g.test(command.name)
          );
        },
      };
    };
  }

}
