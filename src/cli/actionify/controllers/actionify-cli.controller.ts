import { CliController } from "../../../cli/modules/common/controllers";
import { ListCommandsHandler } from "../../../cli/modules/common/handlers";
import {
  HelpHandler,
  NativeModuleInstallHandler,
  OcrAddLanguageHandler,
  OcrListLanguageHandler,
  OcrListLocalLanguageHandler,
  OcrListRemoteLanguageHandler,
  OcrRemoveLanguageHandler,
  TtsAddModelHandler,
  TtsListLocalModelHandler,
  TtsListModelHandler,
  TtsListRemoteModelHandler,
  TtsRemoveModelHandler,
  VersionHandler
} from "../handlers";

export class ActionifyCliController extends CliController {

  public constructor() {
    super([
      {
        name: "help",
        aliases: ["h", "-h", "--help"],
        description: "Lists all available commands.",
        handler: HelpHandler,
      },
      {
        name: "version",
        aliases: ["v", "-v", "--version"],
        description: "Outputs Actionify CLI version.",
        handler: VersionHandler,
      },
      {
        name: "postinstall",
        aliases: ["post-install", "pi", "-pi", "--post-install", "install", "i", "-i", "--install"],
        description: "Installs Actionify's OS specific native module.",
        handler: NativeModuleInstallHandler,
      },
      {
        name: "native-module",
        aliases: ["nm", "native", "module"],
        description: "Lists all native module commands.",
        handler: ListCommandsHandler,
        subCommands: [
          {
            name: "install",
            aliases: ["i", "-i", "--install", "add", "a", "-a", "--add"],
            description: "Installs Actionify's official OS specific native module.",
            handler: NativeModuleInstallHandler,
            subCommands: [
              {
                name: "<file>",
                aliases: [],
                description: "Installs a custom Actionify OS specific native module.",
                handler: NativeModuleInstallHandler,
              }
            ]
          }
        ]
      },
      {
        name: "ocr",
        aliases: [],
        description: "Lists all OCR commands.",
        handler: ListCommandsHandler,
        subCommands: [
          {
            name: "language",
            aliases: ["l", "-l", "--language", "lang", "-lang", "--lang"],
            description: "Lists all OCR language commands.",
            handler: ListCommandsHandler,
            subCommands: [
              {
                name: "list",
                aliases: ["l", "-l", "--list", "ls", "-ls", "--ls"],
                description: "Lists all OCR languages.",
                handler: OcrListLanguageHandler,
                subCommands: [
                  {
                    name: "all",
                    aliases: ["a", "-a", "--all"],
                    description: "Lists all OCR languages.",
                    handler: OcrListLanguageHandler,
                  },
                  {
                    name: "remote",
                    aliases: ["r", "-r", "--remote", "online", "-online", "--online"],
                    description: "Lists all remote OCR languages.",
                    handler: OcrListRemoteLanguageHandler,
                  },
                  {
                    name: "local",
                    aliases: ["l", "-l", "--local", "offline", "-offline", "--offline"],
                    description: "Lists all local OCR languages.",
                    handler: OcrListLocalLanguageHandler,
                  }
                ]
              },
              {
                name: "add",
                aliases: ["a", "-a", "--add", "install", "-i", "--install"],
                description: "Lists all OCR languages.",
                handler: OcrListLanguageHandler,
                subCommands: [
                  {
                    name: "<language>",
                    aliases: [],
                    description: "Adds a new OCR language.",
                    handler: OcrAddLanguageHandler,
                  },
                  {
                    name: "<file>",
                    aliases: [],
                    description: "Adds a custom .traineddata file.",
                    handler: OcrAddLanguageHandler,
                  }
                ]
              },
              {
                name: "remove",
                aliases: ["rm", "-r", "--remove", "delete", "--delete", "uninstall", "--uninstall"],
                description: "Lists all OCR language remove commands.",
                handler: ListCommandsHandler,
                subCommands: [
                  {
                    name: "<language>",
                    aliases: [],
                    description: "Removes an OCR language.",
                    handler: OcrRemoveLanguageHandler,
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        name: "tts",
        aliases: [],
        description: "Lists all TTS commands.",
        handler: ListCommandsHandler,
        subCommands: [
          {
            name: "model",
            aliases: ["m", "-m", "--model"],
            description: "Lists all TTS model commands.",
            handler: ListCommandsHandler,
            subCommands: [
              {
                name: "list",
                aliases: ["l", "-l", "--list", "ls", "-ls", "--ls"],
                description: "Lists all TTS models.",
                handler: TtsListModelHandler,
                subCommands: [
                  {
                    name: "all",
                    aliases: ["a", "-a", "--all"],
                    description: "Lists all TTS models.",
                    handler: TtsListModelHandler,
                  },
                  {
                    name: "remote",
                    aliases: ["r", "-r", "--remote", "online", "-online", "--online"],
                    description: "Lists all remote TTS models.",
                    handler: TtsListRemoteModelHandler,
                  },
                  {
                    name: "local",
                    aliases: ["l", "-l", "--local", "offline", "-offline", "--offline"],
                    description: "Lists all local TTS models.",
                    handler: TtsListLocalModelHandler,
                  }
                ]
              },
              {
                name: "add",
                aliases: ["a", "-a", "--add", "install", "-i", "--install"],
                description: "Lists all TTS models.",
                handler: TtsListModelHandler,
                subCommands: [
                  {
                    name: "<model>",
                    aliases: [],
                    description: "Adds a new TTS model.",
                    handler: TtsAddModelHandler,
                  },
                  {
                    name: "<directory>",
                    aliases: [],
                    description: "Adds a custom TTS model (using Kitten, Kokoro or VITS engine).",
                    handler: TtsAddModelHandler,
                  }
                ]
              },
              {
                name: "remove",
                aliases: ["rm", "-r", "--remove", "delete", "--delete", "uninstall", "--uninstall"],
                description: "Lists all TTS model remove commands.",
                handler: ListCommandsHandler,
                subCommands: [
                  {
                    name: "<model>",
                    aliases: [],
                    description: "Removes a TTS model.",
                    handler: TtsRemoveModelHandler,
                  }
                ]
              }
            ]
          }
        ]
      }
    ]);
  }

  protected _noArgsHandler(...args: string[]): number | Promise<number> {
    return HelpHandler(null as any, args, this);
  }

}
