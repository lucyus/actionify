import fs from "node:fs";
import path from "node:path";
import { CliController } from "../../../../../cli/modules/common/controllers";
import { TerminalSpinnerHelper } from "../../../../../cli/modules/common/helpers";
import type { Command, CommandWithAscendants } from "../../../../../cli/modules/common/types";
import { name as pkgName } from "../../../../../../package.json";
import { RepositoryHelper, TesseractHelper } from "../../../helpers";
import { OcrListLocalLanguageHandler } from "../../../handlers";


export const OcrRemoveLanguageHandler: Command["handler"] = async (
  command: CommandWithAscendants,
  args: string[],
  controller: CliController
) => {
  const terminalSpinner = new TerminalSpinnerHelper({ persist: true });
  try {
    const ocrDataFolderPath = await RepositoryHelper.resolveDataDirectory(["ocr"]);
    terminalSpinner.start({ suffix: ` Fetching locally installed OCR languages` });
    const localTrainedDataFiles = fs.readdirSync(ocrDataFolderPath)
      .filter((file: string) => file.endsWith(".traineddata"))
      .sort()
    ;
    terminalSpinner.stop(true);
    if (localTrainedDataFiles.length === 0) {
      controller.cliOutput.info();
      controller.cliOutput.info("No OCR traineddata files found.");
      controller.cliOutput.info("Nothing to do.");
      return 0;
    }
    const userLanguageCode = args[args.length - 1].replace(".traineddata", "");
    terminalSpinner.start({ suffix: ` Gathering OCR language metadata` });
    const languagesMap = await TesseractHelper.fetchLanguagesMap();
    terminalSpinner.stop(true);
    terminalSpinner.start({ suffix: ` Resolving ${userLanguageCode}.traineddata` });
    const trainedDataFileToRemove = localTrainedDataFiles.find((file: string) => file === `${userLanguageCode}.traineddata`);
    if (!trainedDataFileToRemove) {
      terminalSpinner.stop(false);
      controller.cliOutput.info();
      controller.cliOutput.info(`"${languagesMap.get(userLanguageCode) || userLanguageCode}.traineddata" OCR file not found.`);
      controller.cliOutput.info("Nothing to do.");
      return OcrListLocalLanguageHandler(command, args, controller);
    }
    terminalSpinner.stop(true);
    const trainedDataFileToRemovePath = path.join(ocrDataFolderPath, trainedDataFileToRemove);
    terminalSpinner.start({ suffix: ` Removing ${userLanguageCode}.traineddata` });
    fs.unlinkSync(trainedDataFileToRemovePath);
    terminalSpinner.stop(true);
    controller.cliOutput.info();
    controller.cliOutput.info(`Successfully removed ${languagesMap.get(userLanguageCode) || userLanguageCode} OCR support file from ${pkgName}:`);
    controller.cliOutput.info(`  • Removed from: ${path.dirname(trainedDataFileToRemovePath)}`);
    return 0;
  }
  catch (error) {
    controller.cliOutput.error(error);
    return 1;
  }
};
