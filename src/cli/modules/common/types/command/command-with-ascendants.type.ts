import type { Command } from "../../../../../cli/modules/common/types";

export type CommandWithAscendants = Command & {
    ascendants: CommandWithAscendants[];
};
