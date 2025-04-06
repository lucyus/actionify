import { Actionify } from "../../../core";
import {
  keyPressDown,
  keyPressUp,
  typeUnicodeCharacter,
} from "../../../addon";
import { KeyboardEventsController, KeyboardTracksController } from "../../../core/controllers";
import { KeyMapper } from "../../../core/services";
import type { CaseInsensitiveKey } from "../../../core/types";
import { Inspectable } from "../../../core/utilities";

/**
 * @description Common keyboard operations.
 */
export class KeyboardController {

  #keyboardEventsController: KeyboardEventsController;
  #keyboardTracksController: KeyboardTracksController;

  public constructor() {
    this.#keyboardEventsController = new KeyboardEventsController();
    this.#keyboardTracksController = new KeyboardTracksController();
  }

  /**
   * @description Input events listening manager.
   */
  public get events(): KeyboardEventsController {
    return this.#keyboardEventsController;
  }

  /**
   * @description Input events recorder and replayer.
   */
  public get track(): KeyboardTracksController {
    return this.#keyboardTracksController;
  }

  /**
   * @description Press a single keyboard key.
   *
   * @param keyCodeOrKey The keyboard {@link https://learn.microsoft.com/fr-fr/windows/win32/inputdev/virtual-key-codes virtual key code} or key name to press.
   * @returns A promise which resolves after the key is pressed.
   *
   * ---
   * @example
   * // Press the "A" key immediately using its key name
   * Actionify.keyboard.down("a");
   *
   * // Press the "A" key in 1 second using its key name
   * await Actionify.keyboard.down("a", { delay: 1000 });
   *
   * // Press the "A" key immediately using its virtual key code
   * Actionify.keyboard.down(0x41);
   *
   * // Press the "A" key in 1 second using its virtual key code
   * await Actionify.keyboard.down(0x41, { delay: 1000 });
   */
  public async down<T extends string>(keyCodeOrKey: number | CaseInsensitiveKey<T>, options?: { delay?: number }) {
    const delay = Math.max(0, Math.floor(options?.delay ?? 0));
    if (typeof keyCodeOrKey === 'number') {
      const keyCode = keyCodeOrKey;
      return Actionify.time.waitAsync(delay, () => keyPressDown(keyCode));
    }
    const key = keyCodeOrKey;
    const keyCode = KeyMapper.toKeyCode(key);
    return Actionify.time.waitAsync(delay, () => keyPressDown(keyCode));
  }

  /**
   * @description Release a single keyboard key.
   *
   * @param keyCodeOrKey The keyboard {@link https://learn.microsoft.com/fr-fr/windows/win32/inputdev/virtual-key-codes virtual key code} or key name to release.
   * @returns A promise which resolves after the key is released.
   *
   * ---
   * @example
   * // Release the "A" key immediately using its key name
   * Actionify.keyboard.up("a");
   *
   * // Release the "A" key in 1 second using its key name
   * await Actionify.keyboard.up("a", { delay: 1000 });
   *
   * // Release the "A" key immediately using its virtual key code
   * Actionify.keyboard.up(0x41);
   *
   * // Release the "A" key in 1 second using its virtual key code
   * await Actionify.keyboard.up(0x41, { delay: 1000 });
   */
  public async up<T extends string>(keyCodeOrKey: number | CaseInsensitiveKey<T>, options?: { delay?: number }) {
    const delay = Math.max(0, Math.floor(options?.delay ?? 0));
    if (typeof keyCodeOrKey === 'number') {
      const keyCode = keyCodeOrKey;
      return Actionify.time.waitAsync(delay, () => keyPressUp(keyCode));
    }
    const key = keyCodeOrKey;
    const keyCode = KeyMapper.toKeyCode(key);
    return Actionify.time.waitAsync(delay, () => keyPressUp(keyCode));
  }

  /**
   * @description Tap (press then release) a single keyboard key.
   *
   * @param keyCodeOrKey The keyboard {@link https://learn.microsoft.com/fr-fr/windows/win32/inputdev/virtual-key-codes virtual key code} or key name to tap.
   * @returns A promise which resolves after the key is tapped.
   *
   * ---
   * @example
   * // Tap the "A" key immediately using its key name
   * Actionify.keyboard.tap("a");
   *
   * // Tap the "A" key in 1 second using its key name
   * await Actionify.keyboard.tap("a", { delay: 1000 });
   *
   * // Tap the "A" key immediately using its virtual key code
   * Actionify.keyboard.tap(0x41);
   *
   * // Tap the "A" key in 1 second using its virtual key code
   * await Actionify.keyboard.tap(0x41, { delay: 1000 });
   */
  public async tap<T extends string>(keyCodeOrKey: number | CaseInsensitiveKey<T>, options?: { delay?: number }) {
    const delay = Math.max(0, Math.floor(options?.delay ?? 0)) / 2;
    await this.down(keyCodeOrKey, { delay });
    await this.up(keyCodeOrKey, { delay });
  }

  /**
   * @description Type the given text.
   *
   * @param text The text to type.
   * @returns A promise which resolves after the text has been typed.
   *
   * ---
   * @example
   * // Type "Hello, world!" immediately
   * Actionify.keyboard.type("Hello, world!");
   *
   * // Type a multi-line text with unicode characters immediately
   * Actionify.keyboard.type(`
   * Hello,
   * world!
   * 👋
   * `);
   *
   * // Type "Hello, world!" over 1 second
   * await Actionify.keyboard.type("Hello, world!", { delay: 1000 });
   *
   * // Type a multi-line text with unicode characters over 1 second
   * await Actionify.keyboard.type(`
   * Hello,
   * world!
   * 👋
   * `, { delay: 1000 });
   */
  public async type(text: string, options?: { delay?: number }) {
    const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" }); // requires ES2022 support
    const characters = Array.from(segmenter.segment(text)).map((segmentData) => segmentData.segment);
    const delay = Math.max(0, Math.floor(options?.delay ?? 0)) / characters.length;
    let accumulatedDelay = 0;
    const promises = [];
    for (const character of characters) {
      accumulatedDelay += delay;
      promises.push(
        Actionify.time.waitAsync(accumulatedDelay, () => typeUnicodeCharacter(character))
      );
    }
    await Promise.all(promises);
  }

  /**
   * @description Customize the default inspect output (with `console.log`) of a
   * class instance.
   */
  public [Symbol.for('nodejs.util.inspect.custom')](depth: number, inspectOptions: object, inspect: Function) {
    return Inspectable.format(this, depth, inspectOptions, inspect);
  }

}
