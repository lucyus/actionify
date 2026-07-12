import { CliController } from "../../../../../../cli/modules/common/controllers";
import { CommandHelper, TerminalSpinnerHelper } from "../../../../../modules/common/helpers";
import type { Command, CommandWithAscendants } from "../../../../../../cli/modules/common/types";
import { SherpaOnnxHelper } from "../../../../helpers";

export const TtsListRemoteModelHandler: Command["handler"] = async (
  command: CommandWithAscendants,
  args: string[],
  controller: CliController
) => {
  const terminalSpinner = new TerminalSpinnerHelper({ persist: false });
  try {
    terminalSpinner.start({ suffix: ` Fetching available TTS models` });
    const commandFullName = `${controller.cliName} ${CommandHelper.fullName(command)}`;
    const ttsModels = await SherpaOnnxHelper.fetchDownloadableTtsModels(commandFullName);
    if (ttsModels.length === 0) {
      terminalSpinner.stop(false);
      controller.cliOutput.error(`Error: No TTS models found. Please check Sherpa ONNX's TTS model repository (https://api.github.com/repos/k2-fsa/sherpa-onnx/releases/tags/tts-models)`);
      return 1;
    }
    terminalSpinner.stop(true);
    const maxModelNameLength = Math.max(...ttsModels.map((asset) => asset.name.replace(".tar.bz2", "").length));
    const addCommandFullName = CommandHelper.fullName(command).replace(new RegExp(`${command.name}(?![\s\S]*${command.name})`), "add");
    controller.cliOutput.info();
    controller.cliOutput.info("Commands:");
    for (const ttsModel of ttsModels) {
      controller.cliOutput.info(`  • ${controller.cliName} ${addCommandFullName} ${ttsModel.name.replace(".tar.bz2", "").padEnd(maxModelNameLength)}   | Enables TTS for ${SherpaOnnxHelper.inferLanguage(ttsModel.name) || "Unknown Language"}`);
    }
    return 0;
  }
  catch (error: any) {
    terminalSpinner.stop(false);
    controller.cliOutput.error(error?.message || error);
    return 1;
  }
};
