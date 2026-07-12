import fs from "fs/promises";
import path from "path";
import { RepositoryHelper } from "../../../cli/actionify/helpers";
import { Actionify } from "../../../core";
import {
  playSound,
  textToSpeech,
} from "../../../addon";
import { SoundTrackController } from "../../../core/controllers";
import { Inspectable } from "../../../core/utilities";

/**
 * @description Common sound operations.
 */
export class SoundController {

  public constructor() { }

  /**
   * @description Play an audio file.
   *
   * @param audioPath The path to the audio file to play.
   * @param options The options for playing the audio file.
   * @returns A promise that resolves when the audio file has finished playing.
   *
   * ---
   * @example
   * // Play an audio file
   * Actionify.sound.play("/path/to/audio.mp3");
   *
   * // Play an audio file with a custom volume (between `0.0` and `1.0`, defaults to `1.0`)
   * Actionify.sound.play("/path/to/audio.mp3", { volume: 0.5 });
   *
   * // Play an audio file with a custom speed (between `0.01` and `4.0`, defaults to `1.0`)
   * Actionify.sound.play("/path/to/audio.mp3", { speed: 2.0 });
   *
   * // Play an audio file with a custom start and end time (in milliseconds)
   * Actionify.sound.play("/path/to/audio.mp3", { time: { start: 5000, end: 10000 } });
   */
  public play(audioPath: string, options?: { volume?: number, speed?: number, time?: { start?: number, end?: number } }) {
    if (!Actionify.filesystem.exists(audioPath)) {
      throw new Error(`Audio file not found: ${audioPath}`);
    }
    const absoluteAudioPath = path.resolve(audioPath);
    const volume = Math.max(0.0, Math.min(1.0, options?.volume ?? 1.0));
    const speed = Math.max(0.01, Math.min(4.0, options?.speed ?? 1.0));
    const startTime = options?.time?.start;
    const endTime = options?.time?.end;
    const sound = playSound(absoluteAudioPath, volume, speed, startTime, endTime);
    return new SoundTrackController(sound.id, absoluteAudioPath, volume, speed, sound.duration, startTime, endTime);
  }

  /**
   * @description Convert text to speech (TTS) and play it.
   *
   * @param text The text to speak.
   * @param options.volume The volume of the speech (between `0.0` and `1.0`). Default is `1.0`.
   * @param options.speed The speed of the speech (between `0.01` and `4.0`). Default is `1.0` (normal speed).
   * @param options.model The model to use for the speech. Default is the first available model locally. You can:
   *   - Get the list of available models by running this Terminal command:
   *     `npx actionify tts model list`
   *   - Install additional models by running this Terminal command:
   *     `npx actionify tts model add <model_name>`
   * @returns A promise that resolves when the speech has finished playing.
   *
   * ---
   * @example
   * // Speak text with default options
   * Actionify.sound.say("Hello, world!");
   * // Speak text with custom volume
   * Actionify.sound.say("Hello, world!", { volume: 0.8 });
   * // Speak text with custom speed
   * Actionify.sound.say("Hello, world!", { speed: 0.5 });
   * // Speak text with a specific TTS model
   * Actionify.sound.say("Hello, world!", { model: "kokoro-en-v0_19" });
   */
  public async say(text: string, options?: { volume?: number, speed?: number, model?: string }) {
    const volume = Math.max(0.0, Math.min(1.0, options?.volume ?? 1.0));
    const speed = Math.max(0.01, Math.min(4.0, options?.speed ?? 1.0));
    const modelName = options?.model ?? (await this.#fetchDefaultLocalTtsModelIfExistsElseThrow());
    try {
      await textToSpeech(text, volume, speed, modelName);
      return;
    }
    catch (error: any) {
      if (error?.message?.includes("TTS model not found")) {
        throw new Error([
          ``,
          `==========================================`,
          `TTS model "${modelName}" not found.`,
          `Install it using the following command:`,
          `    \x1b[96mnpx actionify tts model add ${modelName}\x1b[0m`,
          `==========================================`,
        ].join("\n"));
      }
      throw error;
    }
  }

  async #fetchDefaultLocalTtsModelIfExistsElseThrow() {
    const ttsDataFolderPath = await RepositoryHelper.resolveDataDirectory(["tts"]);
    const localTtsModelsNames = (await fs.readdir(ttsDataFolderPath, { withFileTypes: true }))
      .filter((fileOrDirectory) => fileOrDirectory.isDirectory())
      .map((directory) => directory.name);
    ;
    if (localTtsModelsNames.length > 0) {
      return localTtsModelsNames[0];
    }
    throw new Error([
      ``,
      `==========================================`,
      `No local TTS model found.`,
      `Browse the list of available models using the following command:`,
      `    \x1b[96mnpx actionify tts model list\x1b[0m`,
      `Then install one using the following command:`,
      `    \x1b[96mnpx actionify tts model add <model_name>\x1b[0m`,
      `==========================================`,
    ].join("\n"));
  }

  /**
   * @description Customize the default inspect output (with `console.log`) of a
   * class instance.
   */
  public [Symbol.for('nodejs.util.inspect.custom')](depth: number, inspectOptions: object, inspect: Function) {
    return Inspectable.format(this, depth, inspectOptions, inspect);
  }

}
