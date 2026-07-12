import fs from "node:fs";
import path from "node:path";
import { CliController } from "../../../../../cli/modules/common/controllers";
import { CommandHelper, TerminalSpinnerHelper } from "../../../../../cli/modules/common/helpers";
import type { Command, CommandWithAscendants } from "../../../../../cli/modules/common/types";
import { name as pkgName } from "../../../../../../package.json";
import { RepositoryHelper, SherpaOnnxHelper } from "../../../helpers";


export const TtsAddModelHandler: Command["handler"] = async (
  command: CommandWithAscendants,
  args: string[],
  controller: CliController
) => {
  const terminalSpinner = new TerminalSpinnerHelper({ persist: true });
  try {
    const userTtsModelNameOrFile = args[args.length - 1];
    if (fs.existsSync(userTtsModelNameOrFile)) {
      const userTtsModelFilePath = userTtsModelNameOrFile;
      const userTtsModelFileName = path.basename(userTtsModelFilePath);
      const userTtsModelFolderSize = SherpaOnnxHelper.localModelSizeInBytes(userTtsModelFilePath);
      const ttsDataFolderPath = await RepositoryHelper.resolveDataDirectory(["tts"]);
      const downloadLocation = path.join(ttsDataFolderPath, userTtsModelFileName);
      terminalSpinner.start({ suffix: ` Installing ${userTtsModelFileName} (${(userTtsModelFolderSize / 1024 / 1024).toFixed(2)} MB)` });
      fs.cpSync(userTtsModelFilePath, downloadLocation, { recursive: true });
      terminalSpinner.stop(true);
      controller.cliOutput.info();
      controller.cliOutput.info(`Successfully installed ${SherpaOnnxHelper.inferLanguage(userTtsModelFileName) || "Unknown Language"} TTS support for ${pkgName}:`);
      controller.cliOutput.info(`  • Location: ${downloadLocation}`);
      controller.cliOutput.info(`  • Size: ${(userTtsModelFolderSize / 1024 / 1024).toFixed(2)} MB`);
    }
    else {
      const userTtsModelName = userTtsModelNameOrFile;
      terminalSpinner.start({ suffix: ` Fetching available TTS models` });
      const parentCommand = command.ascendants[command.ascendants.length - 1] || command;
      const commandFullName = `${controller.cliName} ${CommandHelper.fullName(parentCommand)} ${userTtsModelName}`;
      const allTtsModels = await SherpaOnnxHelper.fetchDownloadableTtsModels(commandFullName);
      terminalSpinner.stop(true);
      terminalSpinner.start({ suffix: ` Resolving ${userTtsModelName}` });
      const userTtsModel = allTtsModels.find((asset) => asset.name.includes(userTtsModelName));
      if (!userTtsModel) {
        terminalSpinner.stop(false);
        controller.cliOutput.error(`Error: Could not find TTS model "${userTtsModelName}".`);
        controller.cliOutput.info();
        const parentCommandFullName = CommandHelper.fullName(parentCommand).replace(new RegExp(`${parentCommand.name}(?![\s\S]*${parentCommand.name})`), "list");
        controller.cliOutput.info(`Run "${controller.cliName} ${parentCommandFullName}" to list available TTS models.`);
        return 1;
      }
      terminalSpinner.stop(true);
      const ttsDataFolderPath = await RepositoryHelper.resolveDataDirectory(["tts"]);
      terminalSpinner.start({ suffix: ` Downloading ${userTtsModel.name} (${(userTtsModel.size / 1024 / 1024).toFixed(2)} MB)` });
      const downloadLocation = await SherpaOnnxHelper.downloadTtsModelFile(userTtsModel, ttsDataFolderPath);
      terminalSpinner.stop(true);
      const userTtsModelSize = SherpaOnnxHelper.localModelSizeInBytes(downloadLocation);
      controller.cliOutput.info();
      controller.cliOutput.info(`Successfully installed ${SherpaOnnxHelper.inferLanguage(userTtsModelName) || "Unknown Language"} TTS support for ${pkgName}:`);
      controller.cliOutput.info(`  • Location: ${downloadLocation}`);
      controller.cliOutput.info(`  • Size: ${(userTtsModelSize / 1024 / 1024).toFixed(2)} MB`);
    }
    return 0;
  }
  catch (error: any) {
    terminalSpinner.stop(false);
    controller.cliOutput.error(error?.message || error);
    return 1;
  }
};
