import { CommandWithAscendants } from "../../types";

export class CommandHelper {

  static fullName(command: CommandWithAscendants): string {
    const leafArguments = [];
    for (const ascendant of command.ascendants) {
      leafArguments.push(ascendant.name);
    }
    leafArguments.push(command.name);
    const leafFullName = leafArguments.join(" ");
    return leafFullName;
  }

}
