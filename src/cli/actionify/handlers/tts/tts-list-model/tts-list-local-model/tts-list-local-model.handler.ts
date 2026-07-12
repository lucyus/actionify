import fs from "node:fs";
import path from "node:path";
import { CliController } from "../../../../../../cli/modules/common/controllers";
import { TerminalSpinnerHelper } from "../../../../../../cli/modules/common/helpers";
import type { Command, CommandWithAscendants } from "../../../../../../cli/modules/common/types";
import { RepositoryHelper, SherpaOnnxHelper } from "../../../../helpers";

export const TtsListLocalModelHandler: Command["handler"] = async (
  command: CommandWithAscendants,
  args: string[],
  controller: CliController
) => {
  const terminalSpinner = new TerminalSpinnerHelper({ persist: false });
  try {
    const ttsDataFolderPath = await RepositoryHelper.resolveDataDirectory(["tts"]);
    terminalSpinner.start({ suffix: ` Fetching locally installed TTS models` });
    const localTtsModels = fs.readdirSync(ttsDataFolderPath)
      .filter((file: string) => fs.statSync(path.join(ttsDataFolderPath, file)).isDirectory())
      .sort()
    ;
    terminalSpinner.stop(true);
    if (localTtsModels.length === 0) {
      controller.cliOutput.info();
      controller.cliOutput.info("No TTS models installed locally.");
      return 0;
    }
    controller.cliOutput.info();
    controller.cliOutput.info("Currently installed:");
    for (const ttsModelFolderName of localTtsModels) {
      const ttsModelFileSize = SherpaOnnxHelper.localModelSizeInBytes(path.join(ttsDataFolderPath, ttsModelFolderName));
      controller.cliOutput.info(`  • ${SherpaOnnxHelper.inferLanguage(ttsModelFolderName) || "Unknown Language"}: ${ttsModelFolderName} (${(ttsModelFileSize / 1024 / 1024).toFixed(2)} MB)`);
    }
    return 0;
  }
  catch (error) {
    terminalSpinner.stop(false);
    controller.cliOutput.error(error);
    return 1;
  }
};
