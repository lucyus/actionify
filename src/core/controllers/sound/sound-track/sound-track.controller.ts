import { Actionify } from '../../../../core';
import {
  getSoundSpeed,
  getSoundStatus,
  getSoundTrackTime,
  getSoundVolume,
  pauseSound,
  resumeSound,
  setSoundSpeed,
  setSoundTrackTime,
  setSoundVolume,
  stopSound,
} from "../../../../addon";
import { Inspectable } from '../../../../core/utilities';

/**
 * @description Common sound track operations.
 */
export class SoundTrackController {

  readonly #id: string;
  readonly #absoluteAudioPath: string;
  #volume: number;
  #speed: number;
  #duration: number;
  #startTime?: number;
  #endTime?: number;
  #untilFinished: Promise<number>;

  public constructor(
    id: string,
    absoluteAudioPath: string,
    volume: number,
    speed: number,
    duration: number,
    startTime?: number,
    endTime?: number
  ) {
    this.#id = id;
    this.#absoluteAudioPath = absoluteAudioPath;
    this.#volume = volume;
    this.#speed = speed;
    this.#duration = duration;
    this.#startTime = startTime;
    this.#endTime = endTime;
    this.#untilFinished = new Promise<number>(async(resolve, reject) => {
      await Actionify.time.waitAsync(1);
      const start = Actionify.time.now();
      while (
        this.status === "playing" ||
        this.status === "paused"
      ) {
        await Actionify.time.waitAsync(100);
      }
      const end = Actionify.time.now();
      this.stop();
      resolve(end - start);
    });
  }

  /**
   * @description Pause the sound of the audio file.
   *
   * @returns The sound controller.
   *
   * ---
   * @example
   * // Start playing an audio file
   * const soundController = Actionify.sound.play("/path/to/audio.mp3");
   * // Pause the sound of the audio file
   * soundController.pause();
   */
  public pause() {
    pauseSound(this.#id);
    return this;
  }

  /**
   * @description Resume the sound of the audio file.
   *
   * @returns The sound controller.
   *
   * ---
   * @example
   * // Start playing an audio file
   * const soundController = Actionify.sound.play("/path/to/audio.mp3");
   * // Pause the sound of the audio file
   * soundController.pause();
   * // Resume the sound of the audio file
   * soundController.resume();
   */
  public resume() {
    resumeSound(this.#id);
    return this;
  }

  /**
   * @description Permanently stop the sound of the audio file.
   *
   * ---
   * @example
   * // Start playing an audio file
   * const soundController = Actionify.sound.play("/path/to/audio.mp3");
   * // Permanently stop the sound of the audio file
   * soundController.stop();
   */
  public stop() {
    stopSound(this.#id);
  }

  /**
   * @description Get the duration (track length) of the audio file.
   *
   * @returns The duration of the audio file (in milliseconds).
   *
   * ---
   * @example
   * // Start playing an audio file
   * const soundController = Actionify.sound.play("/path/to/audio.mp3");
   * // Get the duration of the audio file
   * const trackLength = soundController.duration;
   */
  public get duration() {
    return this.#duration;
  }

  /**
   * @description Get the speed of the audio file.
   *
   * @returns The speed of the audio file (1 is normal speed).
   *
   * ---
   * @example
   * // Start playing an audio file
   * const soundController = Actionify.sound.play("/path/to/audio.mp3");
   * // Get the speed of the audio file
   * const currentSpeed = soundController.speed;
   */
  public get speed() {
    return getSoundSpeed(this.#id);
  }

  /**
   * @description Set the speed of the audio file.
   *
   * @param speed The speed of the audio file (1 is normal speed).
   *
   * ---
   * @example
   * // Start playing an audio file
   * const soundController = Actionify.sound.play("/path/to/audio.mp3");
   * // Set the speed of the audio file
   * soundController.speed = 2;
   */
  public set speed(speed: number) {
    const clampedSpeed = Math.max(0, speed);
    setSoundSpeed(this.#id, clampedSpeed);
    this.#speed = clampedSpeed;
  }

  /**
   * @description Get the real-time status of the audio file.
   *
   * @returns The current status of the audio file.
   *
   * ---
   * @example
   * // Start playing an audio file
   * const soundController = Actionify.sound.play("/path/to/audio.mp3");
   * // Get the current status of the audio file
   * const currentStatus = soundController.status;
   */
  public get status(): "playing" | "paused" | "stopped" | "closed" {
    return getSoundStatus(this.#id) || "closed";
  }

  /**
   * @description Get the volume of the audio file.
   *
   * @returns The volume of the audio file (between 0 and 1).
   *
   * ---
   * @example
   * // Start playing an audio file
   * const soundController = Actionify.sound.play("/path/to/audio.mp3");
   * // Get the volume of the audio file
   * const volume = soundController.volume;
   */
  public get volume(): number {
    return getSoundVolume();
  }

  /**
   * @description Set the volume of the audio file.
   *
   * @param volume The volume of the audio file (between 0 and 1).
   *
   * ---
   * @example
   * // Start playing an audio file
   * const soundController = Actionify.sound.play("/path/to/audio.mp3");
   * // Set the volume of the audio file
   * soundController.volume = 0.5;
   */
  public set volume(volume: number) {
    setSoundVolume(volume);
    this.#volume = volume;
  }

  /**
   * @description Get the current position (track timestamp) of the audio file.
   *
   * @returns The current position of the audio file (in milliseconds).
   *
   * ---
   * @example
   * // Start playing an audio file
   * const soundController = Actionify.sound.play("/path/to/audio.mp3");
   * // Get the current position of the audio file
   * const currentPosition = soundController.position;
   */
  public get position(): number {
    return getSoundTrackTime(this.#id);
  }

  /**
   * @description Set the current position (track timestamp) of the audio file.
   *
   * @param position The position of the audio file (in milliseconds).
   *
   * ---
   * @example
   * // Start playing an audio file
   * const soundController = Actionify.sound.play("/path/to/audio.mp3");
   * // Set the current position of the audio file
   * soundController.position = 5000;
   */
  public set position(position: number) {
    const clampedPosition = Math.max(0, Math.min(this.#duration, position));
    setSoundTrackTime(this.#id, clampedPosition);
  }

  /**
   * @description Wait until the audio file has finished playing.
   *
   * @returns A promise that resolves when the audio file has finished playing.
   *
   * ---
   * @example
   * // Start playing an audio file
   * const soundController = Actionify.sound.play("/path/to/audio.mp3");
   * // Wait until the audio file has finished playing
   * await soundController.untilFinished;
   */
  public get untilFinished(): Promise<number> {
    return this.#untilFinished;
  }

  /**
   * @description Customize the default inspect output (with `console.log`) of a
   * class instance.
   */
  public [Symbol.for('nodejs.util.inspect.custom')](depth: number, inspectOptions: object, inspect: Function) {
    return Inspectable.format(this, depth, inspectOptions, inspect);
  }

}
