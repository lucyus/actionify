import { TrayIconBuilder } from "../../../core/builders";
import {
  ArtificialIntelligenceController,
  ClipboardController,
  FilesystemController,
  InputController,
  KeyboardController,
  LifecycleController,
  MouseController,
  ScreenController,
  SoundController,
  TimeController,
  WindowController
} from "../../../core/controllers";
import { Inspectable } from "../../../core/utilities";

/**
 * @description Actionify is a lightweight Node.js automation library for Windows,
 * enabling seamless control of the mouse, keyboard, clipboard, screen, windows
 * and sound, with additional features like OCR and more.
 */
export class ActionifyController {

  static #instance?: ActionifyController;

  #artificialIntelligenceControllerInstance?: ArtificialIntelligenceController;
  #clipboardControllerInstance?: ClipboardController;
  #filesystemControllerInstance?: FilesystemController;
  #inputControllerInstance?: InputController;
  #keyboardControllerInstance?: KeyboardController;
  #lifecycleControllerInstance?: LifecycleController;
  #mouseControllerInstance?: MouseController;
  #screenControllerInstance?: ScreenController;
  #soundControllerInstance?: SoundController;
  #timeControllerInstance?: TimeController;
  #trayIconBuilderInstance?: TrayIconBuilder;
  #windowControllerInstance?: WindowController;

  public constructor () {
    if (ActionifyController.#instance) {
      return ActionifyController.#instance;
    }
    ActionifyController.#instance = this;
  }

  get #artificialIntelligenceController(): ArtificialIntelligenceController {
    return this.#artificialIntelligenceControllerInstance ??= new ArtificialIntelligenceController();
  }

  get #clipboardController(): ClipboardController {
    return this.#clipboardControllerInstance ??= new ClipboardController();
  }

  get #filesystemController(): FilesystemController {
    return this.#filesystemControllerInstance ??= new FilesystemController();
  }

  get #inputController(): InputController {
    return this.#inputControllerInstance ??= new InputController();
  }

  get #keyboardController(): KeyboardController {
    return this.#keyboardControllerInstance ??= new KeyboardController();
  }

  get #lifecycleController(): LifecycleController {
    return this.#lifecycleControllerInstance ??= new LifecycleController();
  }

  get #mouseController(): MouseController {
    return this.#mouseControllerInstance ??= new MouseController();
  }

  get #screenController(): ScreenController {
    return this.#screenControllerInstance ??= new ScreenController();
  }

  get #soundController(): SoundController {
    return this.#soundControllerInstance ??= new SoundController();
  }

  get #trayIconBuilder(): TrayIconBuilder {
    return this.#trayIconBuilderInstance ??= new TrayIconBuilder();
  }

  get #timeController(): TimeController {
    return this.#timeControllerInstance ??= new TimeController();
  }

  get #windowController(): WindowController {
    return this.#windowControllerInstance ??= new WindowController();
  }

  /**
   * @description Artificial Intelligence based operations.
   */
  public get ai(): ArtificialIntelligenceController {
    return this.#artificialIntelligenceController;
  }

  /**
   * @description Common clipboard operations.
   */
  public get clipboard(): ClipboardController {
    return this.#clipboardController;
  }

  /**
   * @description Common filesystem operations.
   */
  public get filesystem(): FilesystemController {
    return this.#filesystemController;
  }

  /**
   * @description Global input operations.
   */
  public get input(): InputController {
    return this.#inputController;
  }

  /**
   * @description Common keyboard operations.
   */
  public get keyboard(): KeyboardController {
    return this.#keyboardController;
  }

  /**
   * @description Common mouse operations.
   */
  public get mouse(): MouseController {
    return this.#mouseController;
  }

  /**
   * @description Screen information and interaction.
   */
  public get screen(): ScreenController {
    return this.#screenController;
  }

  /**
   * @description Common sound operations.
   */
  public get sound(): SoundController {
    return this.#soundController;
  }

  /**
   * @description Common time management operations.
   */
  public get time(): TimeController {
    return this.#timeController;
  }

  /**
   * @description Create a tray icon.
   *
   * ---
   * @example
   * // Create a default tray icon
   * const trayIconController = this.trayIcon.create();
   *
   * // Create a custom tray icon
   * const trayIconController = this.trayIcon.create({
   *   tooltip: "Your tooltip text",
   *   icon: "/path/to/icon.ico" // You can also use presets: "default", "running", "completed", "paused", "stopped", "info", "success", "warn", "error"
   * });
   */
  public get trayIcon(): TrayIconBuilder {
    return this.#trayIconBuilder;
  }

  /**
   * @description Provide window fetching operations.
   */
  public get window(): WindowController {
    return this.#windowController;
  }

  /**
   * @description Exit the process with the specified exit code.
   *
   * @param exitCode The exit code to exit with.
   *
   * ---
   * @example
   * // Exit the process with success code 0
   * this.exit();
   *
   * // Exit the process with error code 1
   * this.exit(1);
   */
  public exit(exitCode?: number): void {
    return this.#lifecycleController.exit(exitCode);
  }

  /**
   * @description Restart the process in a new detached process.
   *
   * ---
   * @example
   * // Restart the process
   * this.restart();
   */
  public restart(): void {
    return this.#lifecycleController.restart();
  }

  /**
   * @description Execute the given function a specified number of times.
   *
   * @param callback The callback function to execute.
   * @param iterationsOrPredicate The number of times to execute the callback or a predicate function that returns `false` to stop, `true` otherwise. If unset, the callback will be executed indefinitely.
   * @returns A promise that resolves when the callback has been executed until the end of the loop, rejects otherwise.
   *
   * ---
   * @example
   * // Execute a function indefinitely
   * await this.loop((index) => {
   *   console.log("Hello world!");
   * });
   *
   * // Execute a function 10 times
   * await this.loop((index) => {
   *   console.log(`Hello ${index + 1} times!`);
   * }, 10);
   *
   * // Execute a function until a custom condition is met
   * await this.loop((index) => {
   *   console.log("Hello, you had 90% chance to see this!");
   * }, (index) => Math.random() < 0.9);
   */
  public async loop(
    callback: (index: number) => Promise<void> | void,
    iterationsOrPredicate?: number | ((index: number) => boolean | Promise<boolean>)
  ): Promise<void> {
    return this.#lifecycleController.loop(callback, iterationsOrPredicate);
  }

  /**
   * @description Customize the default inspect output (with `console.log`) of a
   * class instance.
   */
  public [Symbol.for('nodejs.util.inspect.custom')](depth: number, inspectOptions: object, inspect: Function) {
    return Inspectable.format(this, depth, inspectOptions, inspect);
  }

}

export const Actionify = new ActionifyController();
export default Actionify;
