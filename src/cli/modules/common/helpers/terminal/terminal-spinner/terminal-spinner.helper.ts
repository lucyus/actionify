import type { TerminalSpinnerOptions } from "../../../types";

export class TerminalSpinnerHelper {

  #currentFrameIndex;
  #frames: string[];
  #frequencyMs: number;
  #persist: boolean;
  #prefix: string;
  #suffix: string;
  #spinnerId: NodeJS.Timeout | null;

  public constructor(options?: TerminalSpinnerOptions) {
    this.#currentFrameIndex = 0;
    this.#frames = options?.frames ?? ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    this.#frequencyMs = options?.frequencyMs ?? 100;
    this.#persist = options?.persist ?? false;
    this.#prefix = options?.prefix ? options.prefix.replace(/\r|\n/g, '') : '';
    this.#suffix = options?.suffix ? options.suffix.replace(/\r|\n/g, '') : '';
    this.#spinnerId = null;
  }

  public get frames(): string[] {
    return this.#frames;
  }

  public set frames(frames: string[]) {
    this.#frames = frames;
  }

  public get frequencyMs(): number {
    return this.#frequencyMs;
  }

  public set frequencyMs(frequencyMs: number) {
    this.#frequencyMs = frequencyMs;
  }

  public get prefix(): string {
    return this.#prefix;
  }

  public get persist(): boolean {
    return this.#persist;
  }

  public set persist(persist: boolean) {
    this.#persist = persist;
  }

  public set prefix(prefix: string) {
    this.#prefix = prefix.replace(/\r|\n/g, '');
  }

  public get suffix(): string {
    return this.#suffix;
  }

  public set suffix(suffix: string) {
    this.#suffix = suffix.replace(/\r|\n/g, '');
  }

  public start(options?: TerminalSpinnerOptions): TerminalSpinnerHelper {
    if (this.#spinnerId) {
      this.stop();
    }

    if (options) {
      this.frames = options.frames ?? this.#frames;
      this.frequencyMs = options.frequencyMs ?? this.#frequencyMs;
      this.prefix = options.prefix ?? this.#prefix;
      this.suffix = options.suffix ?? this.#suffix;
    }

    this.#spinnerId = setInterval(() => {
      process.stdout.write(`\r${this.#prefix}${this.#frames[this.#currentFrameIndex]}${this.#suffix}`);
      this.#currentFrameIndex = (this.#currentFrameIndex + 1) % this.#frames.length;
    }, this.#frequencyMs);

    return this;
  }

  public stop(success: boolean = true): void {
    if (this.#spinnerId) {
      clearInterval(this.#spinnerId);
      this.#spinnerId = null;
      this.#currentFrameIndex = 0;
      process.stdout.clearLine?.(0);
      process.stdout.cursorTo?.(0);
      if (this.#persist) {
        console.log(`${this.#prefix}${success ? '✔ ' : '✖ '}${this.#suffix}`);
      }
    }
  }

}
