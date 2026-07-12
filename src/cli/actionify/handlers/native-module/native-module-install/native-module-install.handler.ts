import fs from "node:fs";
import path from "node:path";
import { ActionifyHelper, RepositoryHelper } from "../../../../../cli/actionify/helpers";
import { CliController, CommandHelper, TerminalSpinnerHelper } from "../../../../../cli/modules";
import type { Command, CommandWithAscendants } from "../../../../../cli/modules/common/types";
import { version as pkgVersion } from "../../../../../../package.json";

export const NativeModuleInstallHandler: Command["handler"] = async (
  command: CommandWithAscendants,
  args: string[],
  controller: CliController
) => {
  const actionifyVersion = pkgVersion;
  const userOsPlatform = process.platform;
  const userOsArch = process.arch;
  const userOperatingSystem = `${userOsPlatform} ${userOsArch}`;
  const supportedOperatingSystems = ["win32 x64", "linux x64"];
  if (!supportedOperatingSystems.includes(userOperatingSystem)) {
    controller.cliOutput.error();
    controller.cliOutput.error(`\x1b[31mError: Unsupported Operating System: ${userOperatingSystem}.\x1b[0m`);
    controller.cliOutput.info();
    controller.cliOutput.info(`Actionify ${actionifyVersion} currently supports:`);
    for (const supportedOperatingSystem of supportedOperatingSystems) {
      controller.cliOutput.info(`  • ${supportedOperatingSystem}`);
    }
    return 1;
  }
  const terminalSpinner = new TerminalSpinnerHelper({ persist: true });
  try {
    const maybeUserCustomNativeModuleFilePath = args[args.length - 1];
    if (fs.existsSync(maybeUserCustomNativeModuleFilePath)) {
      const userCustomNativeModuleFilePath = maybeUserCustomNativeModuleFilePath;
      terminalSpinner.start({ suffix: ` Resolving ${userCustomNativeModuleFilePath}` });
      const userCustomNativeModuleFileSize = fs.statSync(userCustomNativeModuleFilePath).size;
      terminalSpinner.stop(true);
      terminalSpinner.start({ suffix: ` Creating install location` });
      const nativeModuleFolderPath = await RepositoryHelper.resolveNativeModuleDirectory();
      const downloadLocation = path.join(nativeModuleFolderPath, "actionify.node");
      terminalSpinner.stop(true);
      terminalSpinner.start({ suffix: ` Installing ${userCustomNativeModuleFilePath} (${(userCustomNativeModuleFileSize / 1024 / 1024).toFixed(2)} MB)` });
      fs.copyFileSync(userCustomNativeModuleFilePath, downloadLocation);
      terminalSpinner.stop(true);
      controller.cliOutput.info();
      controller.cliOutput.info(`Successfully installed Actionify ${actionifyVersion} native module:`);
      controller.cliOutput.info(`  • Location: ${downloadLocation}`);
      controller.cliOutput.info(`  • Size: ${(userCustomNativeModuleFileSize / 1024 / 1024).toFixed(2)} MB`);
      controller.cliOutput.info(`You are now ready to use Actionify! 🎉`);
    }
    else {
      terminalSpinner.start({ suffix: ` Fetching available Actionify native modules for v${actionifyVersion}` });
      const commandFullName = `${controller.cliName} ${CommandHelper.fullName(command)}`;
      const allNativeModulesFiles = await ActionifyHelper.fetchDownloadableNativeModules(commandFullName);
      terminalSpinner.stop(true);
      const requiredActionifyNativeModuleFileName = `actionify-v${actionifyVersion}-${userOsPlatform}-${userOsArch}.node`;
      terminalSpinner.start({ suffix: ` Resolving ${requiredActionifyNativeModuleFileName}` });
      const nativeModuleFile = allNativeModulesFiles.find((asset) => asset.name === requiredActionifyNativeModuleFileName);
      if (!nativeModuleFile) {
        terminalSpinner.stop(false);
        controller.cliOutput.error(`\x1b[31mError: Could not find native module for Actionify v${actionifyVersion} ${userOperatingSystem}.\x1b[0m`);
        controller.cliOutput.info();
        controller.cliOutput.info(`1. You can download it manually from: https://github.com/lucyus/actionify/releases/download/v${actionifyVersion}/${requiredActionifyNativeModuleFileName}`);
        controller.cliOutput.info(`2. Then, install it by running: \x1b[96mnpx actionify native-module install /path/to/downloaded/${requiredActionifyNativeModuleFileName}\x1b[0m`);
        controller.cliOutput.info();

        controller.cliOutput.info(`\x1b[90mOtherwise, you can report an issue here: https://github.com/lucyus/actionify/issues/new?template=bug_report.yml\x1b[0m`);
        return 1;
      }
      terminalSpinner.stop(true);
      terminalSpinner.start({ suffix: ` Creating install location` });
      const nativeModuleFolderPath = await RepositoryHelper.resolveNativeModuleDirectory();
      terminalSpinner.stop(true);
      terminalSpinner.start({ suffix: ` Downloading ${nativeModuleFile.name} (${(nativeModuleFile.size / 1024 / 1024).toFixed(2)} MB)` });
      const downloadLocation = await ActionifyHelper.downloadNativeModuleFile(nativeModuleFile, nativeModuleFolderPath);
      terminalSpinner.stop(true);
      controller.cliOutput.info();
      controller.cliOutput.info(`Successfully installed Actionify v${actionifyVersion} native module:`);
      controller.cliOutput.info(`  • Location: ${downloadLocation}`);
      controller.cliOutput.info(`  • Size: ${(nativeModuleFile.size / 1024 / 1024).toFixed(2)} MB`);
      controller.cliOutput.info(`You are now ready to use Actionify! 🎉`);
    }
  }
  catch (error: any) {
    terminalSpinner.stop(false);
    controller.cliOutput.error(error?.message || error);
    return 1;
  }
  return 0;
};
