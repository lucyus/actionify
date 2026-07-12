import { CliController } from "../../../../../cli/modules/common/controllers";
import { CommandHelper } from "../../../../modules/common/helpers";
import type { Command, CommandWithAscendants } from "../../../../../cli/modules/common/types";
import type { GithubFile } from "../../../types";
import { TesseractHelper } from "../../../helpers";
import { OcrListRemoteLanguageHandler } from "../../../handlers";
import { OcrListLocalLanguageHandler } from "./ocr-list-local-language";

export const OcrListLanguageHandler: Command["handler"] = async (
  command: CommandWithAscendants,
  args: string[],
  controller: CliController
) => {
  if ((await OcrListRemoteLanguageHandler(command, args, controller)) !== 0) {
    return 1;
  }
  return await OcrListLocalLanguageHandler(command, args, controller);
};
