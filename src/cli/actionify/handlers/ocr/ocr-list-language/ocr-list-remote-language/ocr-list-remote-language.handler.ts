import { CliController } from "../../../../../../cli/modules/common/controllers";
import { CommandHelper, TerminalSpinnerHelper } from "../../../../../modules/common/helpers";
import type { Command, CommandWithAscendants } from "../../../../../../cli/modules/common/types";
import type { GithubFile } from "../../../../types";
import { TesseractHelper } from "../../../../helpers";

export const OcrListRemoteLanguageHandler: Command["handler"] = async (
  command: CommandWithAscendants,
  args: string[],
  controller: CliController
) => {
  const terminalSpinner = new TerminalSpinnerHelper({ persist: false });
  try {
    terminalSpinner.start({ suffix: ` Fetching available OCR languages` });
    const commandFullName = `${controller.cliName} ${CommandHelper.fullName(command)}`;
    const fastTrainedDataFiles = await TesseractHelper.fetchDownloadableTrainedData(commandFullName);
    if (fastTrainedDataFiles.length === 0) {
      terminalSpinner.stop(false);
      controller.cliOutput.error(`Error: No traineddata files found. Please check Tesseract's traineddata repository (https://github.com/tesseract-ocr/tessdata_fast)`);
      return 1;
    }
    terminalSpinner.stop(true);
    const maxLanguageCodeLength = Math.max(...fastTrainedDataFiles.map((file: GithubFile) => file.name.replace(".traineddata", "").length));
    const addCommandFullName = CommandHelper.fullName(command).replace(new RegExp(`${command.name}(?![\s\S]*${command.name})`), "add");
    terminalSpinner.start({ suffix: ` Gathering OCR languages metadata` });
    const languagesMap = await TesseractHelper.fetchLanguagesMap();
    terminalSpinner.stop(true);
    controller.cliOutput.info();
    controller.cliOutput.info("Commands:");
    for (const githubFile of fastTrainedDataFiles) {
      const languageCode = githubFile.name.replace(".traineddata", "");
      controller.cliOutput.info(`  • ${controller.cliName} ${addCommandFullName} ${languageCode.padEnd(maxLanguageCodeLength)}   | Enables OCR for ${languagesMap.get(languageCode) || languageCode}`);
    }
    return 0;
  }
  catch (error: any) {
    terminalSpinner.stop(false);
    controller.cliOutput.error(error?.message || error);
    return 1;
  }
};
