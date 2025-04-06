import path from "path";
import { Actionify } from "../../../core";
import {
  playSound,
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
   * @description Customize the default inspect output (with `console.log`) of a
   * class instance.
   */
  public [Symbol.for('nodejs.util.inspect.custom')](depth: number, inspectOptions: object, inspect: Function) {
    return Inspectable.format(this, depth, inspectOptions, inspect);
  }

}
