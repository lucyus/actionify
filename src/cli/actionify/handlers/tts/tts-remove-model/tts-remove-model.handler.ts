import fs from "node:fs";
import path from "node:path";
import { CliController } from "../../../../../cli/modules/common/controllers";
import { TerminalSpinnerHelper } from "../../../../../cli/modules/common/helpers";
import type { Command, CommandWithAscendants } from "../../../../../cli/modules/common/types";
import { name as pkgName } from "../../../../../../package.json";
import { RepositoryHelper, SherpaOnnxHelper } from "../../../helpers";
import { TtsListLocalModelHandler } from "../../../handlers";


export const TtsRemoveModelHandler: Command["handler"] = async (
  command: CommandWithAscendants,
  args: string[],
  controller: CliController
) => {
  const terminalSpinner = new TerminalSpinnerHelper({ persist: true });
  try {
    const ttsDataFolderPath = await RepositoryHelper.resolveDataDirectory(["tts"]);
    terminalSpinner.start({ suffix: ` Fetching locally installed TTS models` });
    const localTtsModels = fs.readdirSync(ttsDataFolderPath)
      .filter((file: string) => fs.statSync(path.join(ttsDataFolderPath, file)).isDirectory())
      .sort()
    ;
    if (localTtsModels.length === 0) {
      terminalSpinner.stop(false);
      controller.cliOutput.info();
      controller.cliOutput.info("No TTS models found.");
      controller.cliOutput.info("Nothing to do.");
      return 0;
    }
    terminalSpinner.stop(true);
    const userTtsModelToRemove = args[args.length - 1];
    terminalSpinner.start({ suffix: ` Resolving ${userTtsModelToRemove}` });
    const ttsModelToRemove = localTtsModels.find((fileName: string) => fileName === userTtsModelToRemove);
    if (!ttsModelToRemove) {
      terminalSpinner.stop(false);
      controller.cliOutput.info();
      controller.cliOutput.info(`"${userTtsModelToRemove}" TTS model not found.`);
      controller.cliOutput.info("Nothing to do.");
      return TtsListLocalModelHandler(command, args, controller);
    }
    terminalSpinner.stop(true);
    const ttsModelToRemovePath = path.join(ttsDataFolderPath, ttsModelToRemove);
    terminalSpinner.start({ suffix: ` Removing ${ttsModelToRemove}` });
    fs.rmSync(ttsModelToRemovePath, { recursive: true });
    terminalSpinner.stop(true);
    controller.cliOutput.info();
    controller.cliOutput.info(`Successfully removed ${SherpaOnnxHelper.inferLanguage(ttsModelToRemove) || "Unknown Language"} TTS support from ${pkgName}:`);
    controller.cliOutput.info(`  • Removed from: ${path.dirname(ttsModelToRemovePath)}`);
    return 0;
  }
  catch (error) {
    terminalSpinner.stop(false);
    controller.cliOutput.error(error);
    return 1;
  }
};
