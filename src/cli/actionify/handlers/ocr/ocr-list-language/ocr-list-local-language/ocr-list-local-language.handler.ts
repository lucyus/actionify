import fs from "node:fs";
import path from "node:path";
import { CliController } from "../../../../../../cli/modules/common/controllers";
import type { Command, CommandWithAscendants } from "../../../../../../cli/modules/common/types";
import { RepositoryHelper, TesseractHelper } from "../../../../helpers";
import { TerminalSpinnerHelper } from "../../../../../modules";

export const OcrListLocalLanguageHandler: Command["handler"] = async (
  command: CommandWithAscendants,
  args: string[],
  controller: CliController
) => {
  const terminalSpinner = new TerminalSpinnerHelper({ persist: false });
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
      controller.cliOutput.info("No OCR languages installed locally.");
      return 0;
    }
    terminalSpinner.start({ suffix: ` Gathering OCR languages metadata` });
    const languagesMap = await TesseractHelper.fetchLanguagesMap();
    terminalSpinner.stop(true);
    controller.cliOutput.info();
    controller.cliOutput.info("Currently installed:");
    for (const file of localTrainedDataFiles) {
      const languageCode = file.replace(".traineddata", "");
      const trainedDataFileSize = fs.statSync(path.join(ocrDataFolderPath, file)).size;
      controller.cliOutput.info(`  • ${languagesMap.get(languageCode) || languageCode}: ${languageCode}.traineddata (${(trainedDataFileSize / 1024 / 1024).toFixed(2)} MB)`);
    }
    return 0;
  }
  catch (error) {
    terminalSpinner.stop(false);
    controller.cliOutput.error(error);
    return 1;
  }
};
