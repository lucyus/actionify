import path from "path";
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
   * // Play an audio file with a custom volume (between 0 and 1)
   * Actionify.sound.play("/path/to/audio.mp3", { volume: 0.5 });
   *
   * // Play an audio file with a custom speed (between 0 and 4)
   * Actionify.sound.play("/path/to/audio.mp3", { speed: 2 });
   *
   * // Play an audio file with a custom start and end time (in milliseconds)
   * Actionify.sound.play("/path/to/audio.mp3", { time: { start: 5000, end: 10000 } });
   */
  public play(audioPath: string, options?: { volume?: number, speed?: number, time?: { start?: number, end?: number } }) {
    if (!Actionify.filesystem.exists(audioPath)) {
      throw new Error(`Audio file not found: ${audioPath}`);
    }
    const absoluteAudioPath = path.resolve(audioPath);
    const volume = options?.volume ?? 1;
    const speed = options?.speed ?? 1;
    const startTime = options?.time?.start;
    const endTime = options?.time?.end;
    const sound = playSound(absoluteAudioPath, volume, speed, startTime, endTime);
    return new SoundTrackController(sound.id, absoluteAudioPath, volume, speed, sound.duration, startTime, endTime);
  }

  /**
   * @description Convert text to speech (TTS) and play it.
   *
   * @param text The text to speak.
   * @param options.volume The volume of the speech (0 to 100). Default is 100.
   * @param options.speed The speed of the speech (-10 to 10). Default is 0 (normal speed).
   * @param options.voice The voice to use for the speech. Default is your system's default voice. You can:
   *   - Get the list of available voices by running this PowerShell command:
   *     `Add-Type -AssemblyName System.Speech; (New-Object System.Speech.Synthesis.SpeechSynthesizer).GetInstalledVoices() | ForEach-Object { $_.VoiceInfo | Select-Object Name, Culture, Gender, Age, Description }`
   *   - Install additional voices on Windows by going to Settings > Time & Language > Speech > Manage voices > Add voices.
   * @returns A promise that resolves when the speech has finished playing.
   *
   * ---
   * @example
   * // Speak text with default options
   * Actionify.sound.say("Hello, world!");
   * // Speak text with custom volume
   * Actionify.sound.say("Hello, world!", { volume: 80 });
   * // Speak text with custom speed
   * Actionify.sound.say("Hello, world!", { speed: -2 });
   * // Speak text with a specific voice
   * Actionify.sound.say("Hello, world!", { voice: "Microsoft Zira Desktop" });
   */
  public async say(text: string, options?: { volume?: number, speed?: number, voice?: string }) {
    const volume = options?.volume ?? 100;
    const speed = options?.speed ?? 0;
    const voice = options?.voice ?? "";
    return textToSpeech(text, volume, speed, voice);
  }

  /**
   * @description Customize the default inspect output (with `console.log`) of a
   * class instance.
   */
  public [Symbol.for('nodejs.util.inspect.custom')](depth: number, inspectOptions: object, inspect: Function) {
    return Inspectable.format(this, depth, inspectOptions, inspect);
  }

}
