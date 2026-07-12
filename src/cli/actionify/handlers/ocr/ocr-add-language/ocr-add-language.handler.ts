import fs from "node:fs";
import path from "node:path";
import { CliController } from "../../../../../cli/modules/common/controllers";
import { CommandHelper, TerminalSpinnerHelper } from "../../../../../cli/modules/common/helpers";
import type { Command, CommandWithAscendants } from "../../../../../cli/modules/common/types";
import { name as pkgName } from "../../../../../../package.json";
import { RepositoryHelper, TesseractHelper } from "../../../helpers";
import type { GithubFile } from "../../../types";


export const OcrAddLanguageHandler: Command["handler"] = async (
  command: CommandWithAscendants,
  args: string[],
  controller: CliController
) => {
  const terminalSpinner = new TerminalSpinnerHelper({ persist: true });
  try {
    const userLanguageCodeOrFile = args[args.length - 1];
    if (fs.existsSync(userLanguageCodeOrFile)) {
      const userTrainedDataFilePath = userLanguageCodeOrFile;
      const userTrainedDataFileName = path.basename(userTrainedDataFilePath);
      const userTrainedDataFileSize = fs.statSync(userTrainedDataFilePath).size;
      const userLanguageCode = userTrainedDataFileName.replace(".traineddata", "");
      const ocrDataFolderPath = await RepositoryHelper.resolveDataDirectory(["ocr"]);
      const downloadLocation = path.join(ocrDataFolderPath, userTrainedDataFileName);
      terminalSpinner.start({ suffix: ` Installing ${userTrainedDataFileName} (${(userTrainedDataFileSize / 1024 / 1024).toFixed(2)} MB)` });
      fs.copyFileSync(userTrainedDataFilePath, downloadLocation);
      terminalSpinner.stop(true);
      terminalSpinner.start({ suffix: ` Gathering OCR language metadata` });
      const languagesMap = await TesseractHelper.fetchLanguagesMap();
      terminalSpinner.stop(true);
      controller.cliOutput.info();
      controller.cliOutput.info(`Successfully installed ${languagesMap.get(userLanguageCode) || userLanguageCode} OCR support for ${pkgName}:`);
      controller.cliOutput.info(`  • Location: ${downloadLocation}`);
      controller.cliOutput.info(`  • Size: ${(userTrainedDataFileSize / 1024 / 1024).toFixed(2)} MB`);
    }
    else {
      const userLanguageCode = userLanguageCodeOrFile;
      terminalSpinner.start({ suffix: ` Fetching available OCR languages` });
      const parentCommand = command.ascendants[command.ascendants.length - 1] || command;
      const commandFullName = `${controller.cliName} ${CommandHelper.fullName(parentCommand)} ${userLanguageCode}`;
      const allTrainedDataFiles = await TesseractHelper.fetchDownloadableTrainedData(commandFullName);
      terminalSpinner.stop();
      const userTrainedDataFile = allTrainedDataFiles.find((file: GithubFile) => file.name === `${userLanguageCode}.traineddata`);
      if (!userTrainedDataFile) {
        controller.cliOutput.error(`Error: Could not find traineddata file for "${userLanguageCode}".`);
        controller.cliOutput.info();
        const parentCommandFullName = CommandHelper.fullName(parentCommand).replace(new RegExp(`${parentCommand.name}(?![\s\S]*${parentCommand.name})`), "list");
        controller.cliOutput.info(`Run "${controller.cliName} ${parentCommandFullName}" to list available languages.`);
        return 1;
      }
      const ocrDataFolderPath = await RepositoryHelper.resolveDataDirectory(["ocr"]);
      terminalSpinner.start({ suffix: ` Downloading ${userTrainedDataFile.name} (${(userTrainedDataFile.size / 1024 / 1024).toFixed(2)} MB)` });
      const downloadLocation = await TesseractHelper.downloadTrainedDataFile(userTrainedDataFile, ocrDataFolderPath);
      terminalSpinner.stop(true);
      terminalSpinner.start({ suffix: ` Gathering OCR language metadata` });
      const languagesMap = await TesseractHelper.fetchLanguagesMap();
      terminalSpinner.stop(true);
      controller.cliOutput.info();
      controller.cliOutput.info(`Successfully installed ${languagesMap.get(userLanguageCode) || userLanguageCode} OCR support for ${pkgName}:`);
      controller.cliOutput.info(`  • Location: ${downloadLocation}`);
      controller.cliOutput.info(`  • Size: ${(userTrainedDataFile.size / 1024 / 1024).toFixed(2)} MB`);
    }
    return 0;
  }
  catch (error: any) {
    terminalSpinner.stop(false);
    controller.cliOutput.error(error?.message || error);
    return 1;
  }
};
