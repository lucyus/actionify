const {
  getCursorPos,
  setCursorPos,
  leftClickDown,
  leftClickUp,
  rightClickDown,
  rightClickUp,
  mouseWheelScrollDown,
  mouseWheelScrollUp,
  mouseWheelPressDown,
  mouseWheelPressUp,
  keyPressDown,
  keyPressUp,
  typeUnicodeCharacter,
  getAvailableScreens,
  startEventListener,
  stopEventListener,
  cleanResources,
  listWindows,
  focusWindow,
  restoreWindow,
  minimizeWindow,
  maximizeWindow,
  closeWindow,
  setWindowPosition,
  setWindowDimensions,
  setWindowToBottom,
  setWindowToTop,
  setWindowToAlwaysOnTop,
  getPixelColor,
  takeScreenshotToFile,
  copyTextToClipboard,
  copyFileToClipboard,
  sleep,
  suppressInputEvents,
  unsuppressInputEvents,
  performOcrOnImage,
} = require('../../build/Release/actionify.node') as typeof import("@napi/actionify");
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

import { WindowInfo } from './types/window-info/window-info.type';
import { Window } from './types/window/window.type';
import { CaseInsensitiveKey } from './types/key/key.type';
import { KeyMapper } from './services/key-mapper/key-mapper.service';
import { MouseListenerScope } from './types/event/mouse/mouse-listener-scope/mouse-listener-scope.type';
import { KeyboardListenerScope } from './types/event/keyboard/keyboard-listener-scope/keyboard-listener-scope.type';
import { MouseListener } from './types/event/mouse/mouse-listener/mouse-listener.type';
import { InputEvent } from './types/event/input-event/input-event.type';
import { MouseEvent } from './types/event/mouse/mouse-event/mouse-event.type';
import { KeyboardEvent } from './types/event/keyboard/keyboard-event/keyboard-event.type';
import { MouseInput } from './types/event/mouse/mouse-input/mouse-input.type';
import { KeyInput } from './types/event/keyboard/key-input/key-input.type';
import { MouseAction } from './types/event/mouse/mouse-action/mouse-action.type';
import { KeyAction } from './types/event/keyboard/key-action/key-action.type';
import { KeyboardListener } from './types/event/keyboard/keyboard-listener/keyboard-listener.type';
import { MouseState } from './types/event/mouse/mouse-state/mouse-state.type';
import { KeyState } from './types/event/keyboard/key-state/key-state.type';
import { KeyFormatter } from './services/key-formatter/key-formatter.service';
import { ScreenInfo } from './types/screen-info/screen-info.type';
import { MouseRecorderScope } from './types/event/mouse/mouse-recorder-scope/mouse-recorder-scope.type';
import { KeyboardRecorderScope } from './types/event/keyboard/keyboard-recorder-scope/keyboard-recorder-scope.type';
import { InputListenerScope } from './types/event/input/input-listener-scope/input-listener-scope.type';
import { InputAction } from './types/event/input/input-action/input-action.type';
import { Input } from './types/event/input/input/input.type';
import { InputListener } from './types/event/input/input-listener/input-listener.type';
import { InputRecorderScope } from './types/event/input/input/input-recorder-scope/input-recorder-scope.type';
import { Color } from './types/color/color.type';


/**
 * @description Clean up C++ resources before exiting.
 *
 * ---
 * @example
 * process.on('exit', () => { cleanResources(); });
 */
const unexpectedExit = () => {
  cleanResources();
  setImmediate(() => { process.exit(); } );
};
process.on('SIGINT', unexpectedExit);
process.on('SIGTERM', unexpectedExit);
process.on('exit', () => { cleanResources(); });

/**
 * @description Store declared input listeners and recorders.
 */
const mouseListeners: Array<MouseListenerScope> = [];
const mouseRecorders: Array<MouseRecorderScope> = [];
const keyboardListeners: Array<KeyboardListenerScope> = [];
const keyboardRecorders: Array<KeyboardRecorderScope> = [];
const inputListeners: Array<InputListenerScope> = [];
const inputRecorders: Array<InputRecorderScope> = [];
/**
 * @description Store latest history of input events.
 */
const mouseStateHistory = new Map<MouseInput, MouseEvent>();
const keyboardStateHistory = new Map<KeyInput, KeyboardEvent>();
/**
 * @description Store declared file writers.
 */
const fileWriters = new Map<string, fs.WriteStream>();

/**
 * @description Determine whether the main listener should be started.
 *
 * @returns Whether the main listener should be started.
 */
const shouldStartMainListener = () => {
  return (
    mouseListeners.length +
    mouseRecorders.length +
    keyboardListeners.length +
    keyboardRecorders.length +
    inputListeners.length +
    inputRecorders.length
  ) === 1;
};

/**
 * @description Determine whether the main listener should be stopped.
 *
 * @returns Whether the main listener should be stopped.
 */
const shouldStopMainListener = () => {
  return (
    mouseListeners.length +
    mouseRecorders.length +
    keyboardListeners.length +
    keyboardRecorders.length +
    inputListeners.length +
    inputRecorders.length
  ) === 0;
};

/**
 * @description Handle input events and run declared listeners and recorders accordingly.
 * This function is called by C++ Mouse and Keyboard low-level hooks.
 *
 * @param currentEvent
 */
const mainListener = async (currentEvent: InputEvent) => {
  switch(currentEvent.type) {
    case "mouse": {
      // initialize list of runners
      const mouseListenersToRun: MouseListenerScope[] = [];
      const mouseRecordersToRun: MouseRecorderScope[] = [];
      const inputListenersToRun: InputListenerScope[] = [];
      const inputRecordersToRun: InputRecorderScope[] = [];
      // save current mouse event to history
      const currentMouseEvent = currentEvent as MouseEvent;
      mouseStateHistory.set(currentMouseEvent.input, currentMouseEvent);
      // Find mouse listeners that are listening to the current mouse event
      const activeMouseListeners = mouseListeners.filter((mouseListener) => !mouseListener.isPaused && !mouseListener.isRunning);
      for (const mouseListener of activeMouseListeners) {
        const isListeningToCurrentMouseEvent = mouseListener.when.length === 0 || mouseListener.when.find((mouseAction) => mouseAction.input === currentMouseEvent.input) !== undefined;
        if (isListeningToCurrentMouseEvent) {
          let countConditionsMet = 0;
          for (const mouseActionExpected of mouseListener.when) {
            const latestSimilarMouseEvent = mouseStateHistory.get(mouseActionExpected.input);
            if (mouseActionExpected.state === undefined || (latestSimilarMouseEvent && latestSimilarMouseEvent.state === mouseActionExpected.state)) {
              countConditionsMet++;
            }
          }
          if (countConditionsMet === mouseListener.when.length) {
            mouseListenersToRun.push(mouseListener);
          }
        }
      }
      // Find input listeners that are listening to the current mouse event
      const activeInputListeners = inputListeners.filter((inputListener) => !inputListener.isPaused && !inputListener.isRunning);
      for (const inputListener of activeInputListeners) {
        const isListeningToCurrentMouseEvent = inputListener.when.length === 0 || inputListener.when.find((inputAction) => inputAction.input === currentMouseEvent.input) !== undefined;
        if (isListeningToCurrentMouseEvent) {
          let countConditionsMet = 0;
          for (const inputActionExpected of inputListener.when) {
            if (inputActionExpected.type === "mouse") {
              const latestSimilarMouseEvent = mouseStateHistory.get(inputActionExpected.input);
              if (inputActionExpected.state === undefined || (latestSimilarMouseEvent && latestSimilarMouseEvent.state === inputActionExpected.state)) {
                countConditionsMet++;
              }
            }
            else {
              const latestSimilarKeyboardEvent = keyboardStateHistory.get(inputActionExpected.input);
              if (inputActionExpected.state === undefined || (latestSimilarKeyboardEvent && latestSimilarKeyboardEvent.state === inputActionExpected.state)) {
                countConditionsMet++;
              }
            }
          }
          if (countConditionsMet === inputListener.when.length) {
            inputListenersToRun.push(inputListener);
          }
        }
      }
      // Find mouse recorders that are listening to the current mouse event
      const activeMouseRecorders = mouseRecorders.filter((mouseRecorder) => !mouseRecorder.isPaused);
      for (const mouseRecorder of activeMouseRecorders) {
        const isListeningToCurrentMouseEvent = mouseRecorder.when.length === 0 || mouseRecorder.when.find((mouseAction) => mouseAction.input === currentMouseEvent.input) !== undefined;
        if (isListeningToCurrentMouseEvent) {
          let countConditionsMet = 0;
          for (const mouseActionExpected of mouseRecorder.when) {
            const latestSimilarMouseEvent = mouseStateHistory.get(mouseActionExpected.input);
            if (mouseActionExpected.state === undefined || (latestSimilarMouseEvent && latestSimilarMouseEvent.state === mouseActionExpected.state)) {
              countConditionsMet++;
            }
          }
          if (countConditionsMet === mouseRecorder.when.length) {
            mouseRecordersToRun.push(mouseRecorder);
          }
        }
      }
      // Find input recorders that are listening to the current mouse event
      const activeInputRecorders = inputRecorders.filter((inputRecorder) => !inputRecorder.isPaused);
      for (const inputRecorder of activeInputRecorders) {
        const isListeningToCurrentMouseEvent = inputRecorder.when.length === 0 || inputRecorder.when.find((inputAction) => inputAction.input === currentMouseEvent.input) !== undefined;
        if (isListeningToCurrentMouseEvent) {
          let countConditionsMet = 0;
          for (const inputActionExpected of inputRecorder.when) {
            if (inputActionExpected.type === "mouse") {
              const latestSimilarMouseEvent = mouseStateHistory.get(inputActionExpected.input);
              if (inputActionExpected.state === undefined || (latestSimilarMouseEvent && latestSimilarMouseEvent.state === inputActionExpected.state)) {
                countConditionsMet++;
              }
            }
            else {
              const latestSimilarKeyboardEvent = keyboardStateHistory.get(inputActionExpected.input);
              if (inputActionExpected.state === undefined || (latestSimilarKeyboardEvent && latestSimilarKeyboardEvent.state === inputActionExpected.state)) {
                countConditionsMet++;
              }
            }
          }
          if (countConditionsMet === inputRecorder.when.length) {
            inputRecordersToRun.push(inputRecorder);
          }
        }
      }
      // Run eligible mouse listeners
      for (const mouseListener of mouseListenersToRun) {
        mouseListener.isRunning = true;
        const result = mouseListener.listener(currentMouseEvent, mouseListener.controller);
        if (result instanceof Promise) {
          result
            .catch((error) => { console.error(error) })
            .finally(() => { mouseListener.isRunning = false; })
          ;
        }
        else {
          mouseListener.isRunning = false;
        }
      }
      // Run eligible input listeners
      for (const inputListener of inputListenersToRun) {
        inputListener.isRunning = true;
        const result = inputListener.listener(currentMouseEvent, inputListener.controller);
        if (result instanceof Promise) {
          result
            .catch((error) => { console.error(error) })
            .finally(() => { inputListener.isRunning = false; })
          ;
        }
        else {
          inputListener.isRunning = false;
        }
      }
      // Run eligible mouse recorders
      for (const mouseRecorder of mouseRecordersToRun) {
        const type = 0;
        let input = -1;
        switch (currentMouseEvent.input) {
          case "move":
            input = 0;
            break;
          case "left":
            input = 1;
            break;
          case "right":
            input = 2;
            break;
          case "middle":
            input = 3;
            break;
          case "wheel":
            input = 4;
            break;
          default:
            input = -1;
            break;
        }
        let state = -1;
        switch (currentMouseEvent.state) {
          case "down":
            state = 0;
            break;
          case "up":
            state = 1;
            break;
          case "neutral":
            state = 2;
            break;
          default:
            state = -1;
            break;
        }
        const x = currentMouseEvent.position.x;
        const y = currentMouseEvent.position.y;
        const timestamp = currentMouseEvent.timestamp;
        const csvLine = `${type},${timestamp},${input},${state},${x},${y}\n`;
        mouseRecorder.writeStream.write(csvLine);
      }
      // Run eligible input recorders
      for (const inputRecorder of inputRecordersToRun) {
        const type = 0;
        let input = -1;
        switch (currentMouseEvent.input) {
          case "move":
            input = 0;
            break;
          case "left":
            input = 1;
            break;
          case "right":
            input = 2;
            break;
          case "middle":
            input = 3;
            break;
          case "wheel":
            input = 4;
            break;
          default:
            input = -1;
            break;
        }
        let state = -1;
        switch (currentMouseEvent.state) {
          case "down":
            state = 0;
            break;
          case "up":
            state = 1;
            break;
          case "neutral":
            state = 2;
            break;
          default:
            state = -1;
            break;
        }
        const x = currentMouseEvent.position.x;
        const y = currentMouseEvent.position.y;
        const timestamp = currentMouseEvent.timestamp;
        const csvLine = `${type},${timestamp},${input},${state},${x},${y}\n`;
        inputRecorder.writeStream.write(csvLine);
      }
      break;
    }
    case "keyboard": {
      // initialize list of runners
      const keyboardListenersToRun: KeyboardListenerScope[] = [];
      const keyboardRecordersToRun: KeyboardRecorderScope[] = [];
      const inputListenersToRun: InputListenerScope[] = [];
      const inputRecordersToRun: InputRecorderScope[] = [];
      // save current keyboard event to history
      const currentKeyboardEvent = currentEvent as KeyboardEvent;
      keyboardStateHistory.set(currentKeyboardEvent.input, currentKeyboardEvent);
      // Find keyboard listeners that are listening to the current keyboard event
      const activeKeyboardListeners = keyboardListeners.filter((keyboardListener) => !keyboardListener.isPaused && !keyboardListener.isRunning);
      for (const keyboardListener of activeKeyboardListeners) {
        const isListeningToCurrentKeyboardEvent = keyboardListener.when.length === 0 || keyboardListener.when.find((keyboardAction) => keyboardAction.input === currentKeyboardEvent.input) !== undefined;
        if (isListeningToCurrentKeyboardEvent) {
          let countConditionsMet = 0;
          for (const keyboardActionExpected of keyboardListener.when) {
            const latestSimilarKeyboardEvent = keyboardStateHistory.get(keyboardActionExpected.input);
            if (keyboardActionExpected.state === undefined || (latestSimilarKeyboardEvent && latestSimilarKeyboardEvent.state === keyboardActionExpected.state)) {
              countConditionsMet++;
            }
          }
          if (countConditionsMet === keyboardListener.when.length) {
            keyboardListenersToRun.push(keyboardListener);
          }
        }
      }
      // Find input listeners that are listening to the current keyboard event
      const activeInputListeners = inputListeners.filter((inputListener) => !inputListener.isPaused && !inputListener.isRunning);
      for (const inputListener of activeInputListeners) {
        const isListeningToCurrentKeyboardEvent = inputListener.when.length === 0 || inputListener.when.find((inputAction) => inputAction.input === currentKeyboardEvent.input) !== undefined;
        if (isListeningToCurrentKeyboardEvent) {
          let countConditionsMet = 0;
          for (const inputActionExpected of inputListener.when) {
            if (inputActionExpected.type === "mouse") {
              const latestSimilarMouseEvent = mouseStateHistory.get(inputActionExpected.input);
              if (inputActionExpected.state === undefined || (latestSimilarMouseEvent && latestSimilarMouseEvent.state === inputActionExpected.state)) {
                countConditionsMet++;
              }
            }
            else {
              const latestSimilarKeyboardEvent = keyboardStateHistory.get(inputActionExpected.input);
              if (inputActionExpected.state === undefined || (latestSimilarKeyboardEvent && latestSimilarKeyboardEvent.state === inputActionExpected.state)) {
                countConditionsMet++;
              }
            }
          }
          if (countConditionsMet === inputListener.when.length) {
            inputListenersToRun.push(inputListener);
          }
        }
      }
      // Find keyboard recorders that are listening to the current keyboard event
      const activeKeyboardRecorders = keyboardRecorders.filter((keyboardRecorder) => !keyboardRecorder.isPaused);
      for (const keyboardRecorder of activeKeyboardRecorders) {
        const isListeningToCurrentKeyboardEvent = keyboardRecorder.when.length === 0 || keyboardRecorder.when.find((keyboardAction) => keyboardAction.input === currentKeyboardEvent.input) !== undefined;
        if (isListeningToCurrentKeyboardEvent) {
          let countConditionsMet = 0;
          for (const keyboardActionExpected of keyboardRecorder.when) {
            const latestSimilarKeyboardEvent = keyboardStateHistory.get(keyboardActionExpected.input);
            if (keyboardActionExpected.state === undefined || (latestSimilarKeyboardEvent && latestSimilarKeyboardEvent.state === keyboardActionExpected.state)) {
              countConditionsMet++;
            }
          }
          if (countConditionsMet === keyboardRecorder.when.length) {
            keyboardRecordersToRun.push(keyboardRecorder);
          }
        }
      }
      // Find input recorders that are listening to the current keyboard event
      const activeInputRecorders = inputRecorders.filter((inputRecorder) => !inputRecorder.isPaused);
      for (const inputRecorder of activeInputRecorders) {
        const isListeningToCurrentKeyboardEvent = inputRecorder.when.length === 0 || inputRecorder.when.find((inputAction) => inputAction.input === currentKeyboardEvent.input) !== undefined;
        if (isListeningToCurrentKeyboardEvent) {
          let countConditionsMet = 0;
          for (const inputActionExpected of inputRecorder.when) {
            if (inputActionExpected.type === "mouse") {
              const latestSimilarMouseEvent = mouseStateHistory.get(inputActionExpected.input);
              if (inputActionExpected.state === undefined || (latestSimilarMouseEvent && latestSimilarMouseEvent.state === inputActionExpected.state)) {
                countConditionsMet++;
              }
            }
            else {
              const latestSimilarKeyboardEvent = keyboardStateHistory.get(inputActionExpected.input);
              if (inputActionExpected.state === undefined || (latestSimilarKeyboardEvent && latestSimilarKeyboardEvent.state === inputActionExpected.state)) {
                countConditionsMet++;
              }
            }
          }
          if (countConditionsMet === inputRecorder.when.length) {
            inputRecordersToRun.push(inputRecorder);
          }
        }
      }
      // Run eligible keyboard listeners
      for (const keyboardListener of keyboardListenersToRun) {
        keyboardListener.isRunning = true;
        const result = keyboardListener.listener(currentKeyboardEvent, keyboardListener.controller);
        if (result instanceof Promise) {
          result
            .catch((error) => { console.error(error); })
            .finally(() => { keyboardListener.isRunning = false; })
          ;
        }
        else {
          keyboardListener.isRunning = false;
        }
      }
      // Run eligible input listeners
      for (const inputListener of inputListenersToRun) {
        inputListener.isRunning = true;
        const result = inputListener.listener(currentKeyboardEvent, inputListener.controller);
        if (result instanceof Promise) {
          result
            .catch((error) => { console.error(error); })
            .finally(() => { inputListener.isRunning = false; })
          ;
        }
        else {
          inputListener.isRunning = false;
        }
      }
      // Run eligible keyboard recorders
      for (const keyboardRecorder of keyboardRecordersToRun) {
        const type = 1;
        const timestamp = currentKeyboardEvent.timestamp;
        const input = currentKeyboardEvent.input;
        let state = -1;
        switch (currentKeyboardEvent.state) {
          case "down":
            state = 0;
            break;
          case "up":
            state = 1;
            break;
          default:
            state = -1;
            break;
        }
        const csvLine = `${type},${timestamp},${input},${state}\n`;
        keyboardRecorder.writeStream.write(csvLine);
      }
      // Run eligible input recorders
      for (const inputRecorder of inputRecordersToRun) {
        const type = 1;
        const timestamp = currentKeyboardEvent.timestamp;
        const input = currentKeyboardEvent.input;
        let state = -1;
        switch (currentKeyboardEvent.state) {
          case "down":
            state = 0;
            break;
          case "up":
            state = 1;
            break;
          default:
            state = -1;
            break;
        }
        const csvLine = `${type},${timestamp},${input},${state}\n`;
        inputRecorder.writeStream.write(csvLine);
      }
      break;
    }
    default:
      break;
  }
};

/**
 * @description Common filesystem operations.
 */
export const filesystem = {
  /**
   * @description Check if a file is readable.
   *
   * @param filePath Path to the file.
   * @returns Whether the file can be read.
   *
   * ---
   * @example
   * const isReadable = filesystem.canRead("path/to/file.extension");
   */
  canRead(filePath: string) {
    try {
      fs.accessSync(filePath, fs.constants.R_OK);
      return true;
    }
    catch (error) {
      return false;
    }
  },
  /**
   * @description Check if a file is writable.
   *
   * @param filePath Path to the file.
   * @returns Whether the file can be written to.
   *
   * ---
   * @example
   * const isWritable = filesystem.canWrite("path/to/file.extension");
   */
  canWrite(filePath: string) {
    try {
      fs.accessSync(filePath, fs.constants.W_OK);
      return true;
    }
    catch (error) {
      return false;
    }
  },
  /**
   * @description Check if a file is executable.
   *
   * @param filePath Path to the file.
   * @returns Whether the file can be executed.
   *
   * ---
   * @example
   * const isExecutable = filesystem.canExecute("path/to/file.extension");
   */
  canExecute(filePath: string) {
    try {
      fs.accessSync(filePath, fs.constants.X_OK);
      return true;
    }
    catch (error) {
      return false;
    }
  },
  /**
   * @description Check if a file exists.
   *
   * @param filePath Path to the file.
   * @returns Whether the file exists.
   *
   * ---
   * @example
   * const exists = filesystem.exists("path/to/file.extension");
   */
  exists(filePath: string) {
    try {
      fs.accessSync(filePath);
      return true;
    }
    catch (error) {
      return false;
    }
  },
  /**
   * @description Read the whole content of a readable file and return it.
   * If the file is too large, use `readStream` instead.
   *
   * @param filePath Path to a readable file.
   * @returns The content of the file.
   *
   * ---
   * @example
   * const content = filesystem.read("path/to/file.extension");
   */
  read(filePath: string) {
    return fs.readFileSync(filePath, { encoding: "utf-8" });
  },
  /**
   * @description Read a readable file chunk by chunk and return a {@link https://nodejs.org/api/stream.html#readable-streams ReadableStream}.
   *
   * @param filePath Path to a readable file.
   * @returns A {@link https://nodejs.org/api/stream.html#readable-streams ReadableStream} to the file.
   *
   * ---
   * @example
   * const readStream = filesystem.readStream("path/to/file.extension");
   * readStream.on("data", (chunk) => console.log(chunk));
   */
  readStream(filePath: string) {
    return fs.createReadStream(filePath, { encoding: "utf-8" });
  },
  /**
   * @description Write the given content to a writable file. Please note:
   * - If the file already contains content, it will be overwritten.
   * Otherwise, use `append` instead.
   * - If the file is too large, use `writeStream` instead.
   * - If `content` is too large, use `writeStream` instead.
   *
   * @param filePath Path to a writable file.
   * @param content Content to write to the file.
   *
   * ---
   * @example
   * filesystem.write("path/to/file.extension", "Hello, world!");
   */
  write(filePath: string, content: string) {
    fs.writeFileSync(filePath, content, { encoding: "utf-8" });
  },
  /**
   * @description Create a {@link https://nodejs.org/api/stream.html#writable-streams WritableStream} to a writable file.
   *
   * @param filePath Path to a writable file.
   * @returns A {@link https://nodejs.org/api/stream.html#writable-streams WritableStream} to the file.
   *
   * ---
   * @example
   * const writeStream = filesystem.writeStream("path/to/file.extension");
   * writeStream.write("Hello, world!");
   * writeStream.end();
   */
  writeStream(filePath: string) {
    const absoluteFilePath = path.resolve(filePath);
    if (fileWriters.has(absoluteFilePath)) {
      return fileWriters.get(absoluteFilePath)!;
    }
    const writeStream = fs.createWriteStream(absoluteFilePath, { encoding: "utf-8" });
    fileWriters.set(absoluteFilePath, writeStream);
    writeStream.on("close", () => {
      fileWriters.delete(absoluteFilePath);
    });
    return writeStream;
  },
  /**
   * @description Append the given content to a writable file.
   *
   * @param filePath Path to a writable file.
   * @param content Content to append to the file.
   *
   * ---
   * @example
   * filesystem.append("path/to/file.extension", "Hello, world!");
   */
  append(filePath: string, content: string) {
    fs.appendFileSync(filePath, content, { encoding: "utf-8" });
  },
  /**
   * @description Create a file or directory.
   *
   * @param filePath Path to a file or directory.
   * @param isDirectory Whether the file is a directory.
   *
   * ---
   * @example
   * // Create a file
   * filesystem.create("/path/to/file.extension");
   *
   * // Create a directory
   * filesystem.create("/path/to/directory", true);
   */
  create(filePath: string, isDirectory: boolean = false) {
    if (isDirectory) {
      fs.mkdirSync(filePath);
      return;
    }
    this.write(filePath, "");
  },
  /**
   * @description Remove a file or directory.
   *
   * @param filePath Path to a file or directory.
   *
   * ---
   * @example
   * // Remove a file
   * filesystem.remove("/path/to/file.extension");
   *
   * // Remove a directory
   * filesystem.remove("/path/to/directory");
   */
  remove(filePath: string) {
    fs.rmSync(filePath);
  }
};

/**
 * @description Common mouse operations.
 */
export const mouse = {
  /**
   * @description Get current mouse X position.
   * The position is relative to the main monitor (with origin in top-left corner at 0,0).
   *
   * @returns Current mouse X position.
   *
   * ---
   * @example
   * const mouseX = mouse.x;
   */
  get x() {
    return getCursorPos.x;
  },
  /**
   * @description Set current mouse X position.
   *
   * @param x New mouse X position relative to the main monitor (with origin in top-left corner at 0,0).
   *
   * ---
   * @example
   * mouse.x = 100;
   */
  set x(x: number) {
    setCursorPos(x, this.y);
  },
  /**
   * @description Get current mouse Y position.
   * The position is relative to the main monitor (with origin in top-left corner at 0,0).
   *
   * @returns Current mouse Y position.
   *
   * ---
   * @example
   * const mouseY = mouse.y;
   */
  get y() {
    return getCursorPos.y;
  },
  /**
   * @description Set current mouse Y position.
   *
   * @param y New mouse Y position relative to the main monitor (with origin in top-left corner at 0,0).
   *
   * ---
   * @example
   * mouse.y = 100;
   */
  set y(y: number) {
    setCursorPos(this.x, y);
  },
  /**
   * @description Move the mouse to a given position.
   * The position is relative to the main monitor (with origin in top-left corner at 0,0).
   *
   * @param x The new mouse X position. If unset, the current mouse X position will be used.
   * @param y The new mouse Y position. If unset, the current mouse Y position will be used.
   * @param options Additional mouse movement options (delay, motion, intermediate positions, etc.).
   * @returns A promise that resolves when the mouse movement is complete.
   *
   * ---
   * @example
   * // Instant movement
   * mouse.move(100, 100);
   *
   * // Delayed movement in milliseconds
   * await mouse.move(100, 100, { delay: 1000 });
   *
   * // Linear motion over time
   * await mouse.move(100, 100, { motion: "linear", delay: 1000, steps: "auto" });
   *
   * // Arc motion over time
   * await mouse.move(100, 100, { motion: "arc", delay: 1000, steps: "auto" });
   *
   * // Wave motion over time
   * await mouse.move(100, 100, { motion: "wave", delay: 1000, steps: "auto", frequency: "auto" });
   */
  move: (x?: number, y?: number, options?: { steps?: number | "auto", delay?: number, motion?: "linear" | "arc" | "wave", curvinessFactor?: number, mirror?: boolean, frequency?: number | "auto" }) => {
    const steps = options?.steps === "auto" ? Infinity : Math.max(0, Math.round(options?.steps ?? 0));
    const delay = Math.max(0, Math.floor(options?.delay ?? 0));
    const curvinessFactor = options?.curvinessFactor !== undefined ? Math.max(0, Math.min(1, options.curvinessFactor)) : 0.1618;
    const mirror = options?.mirror ?? false;
    const motion = options?.motion ?? "linear";
    const initialX = mouse.x;
    const initialY = mouse.y;
    const newX = x ?? initialX;
    const newY = y ?? initialY;
    if (steps === 0 || delay === 0) {
      return time.waitAsync(delay, () => setCursorPos(newX, newY));
    }
    //Calculate the line from start to end (the shortest diagonal)
    const dx = newX - initialX;
    const dy = newY - initialY;
    // Chebyshev distance
    const intermediatePositions = Math.max(0, Math.max(Math.abs(dx), Math.abs(dy)) - 1);
    const possibleSteps = Math.min(delay, steps, intermediatePositions);
    const preciseDelayPerPosition = delay / (possibleSteps + 1);
    const delayPerPosition = Math.floor(preciseDelayPerPosition);
    let accumulatedDelay = 0;
    const promises: Promise<void>[] = [];
    if (possibleSteps > 0) {
      const correctionDelayOccurrence = preciseDelayPerPosition !== delayPerPosition ? Math.ceil(1 / (preciseDelayPerPosition - delayPerPosition)) : Infinity;
      const directionX = Math.sign(dx);
      const directionY = Math.sign(dy);
      const stepX = dx / (possibleSteps + 1);
      const stepY = dy / (possibleSteps + 1);
      switch (motion) {
        case "linear": {
          for (let offset = 1; offset < possibleSteps + 1; offset++) {
            const intermediateX = directionX !== 0 ? Math.round(initialX + offset * stepX) : newX;
            const intermediateY = directionY !== 0 ? Math.round(initialY + offset * stepY) : newY;
            const correctedDelayPerPosition = delayPerPosition + (offset % correctionDelayOccurrence === 0 ? 1 : 0);
            promises.push(time.waitAsync(correctedDelayPerPosition + accumulatedDelay, () => setCursorPos(intermediateX, intermediateY)));
            accumulatedDelay += correctedDelayPerPosition;
          }
          break;
        }
        case "arc": {
          // Bézier curve
          const midpointX = (initialX + newX) / 2;
          const midpointY = (initialY + newY) / 2;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const perpendicularX = -dy / distance;
          const perpendicularY = dx / distance;
          const direction = mirror ? -1 : 1;
          const controlX = midpointX + curvinessFactor * distance * perpendicularX * direction;
          const controlY = midpointY + curvinessFactor * distance * perpendicularY * direction;
          for (let offset = 1; offset < possibleSteps + 1; offset++) {
            const t = offset / (possibleSteps + 1);
            let intermediateX = Math.round((1 - t) * (1 - t) * initialX + 2 * (1 - t) * t * controlX + t * t * newX);
            let intermediateY = Math.round((1 - t) * (1 - t) * initialY + 2 * (1 - t) * t * controlY + t * t * newY);
            const correctedDelayPerPosition = delayPerPosition + (offset % correctionDelayOccurrence === 0 ? 1 : 0);
            promises.push(time.waitAsync(correctedDelayPerPosition + accumulatedDelay, () => setCursorPos(intermediateX, intermediateY)));
            accumulatedDelay += correctedDelayPerPosition;
          }
          break;
        }
        case "wave": {
          const rawMaxFrequency = Math.floor((possibleSteps + 1) / 30 / 2);
          const maxFrequency = rawMaxFrequency % 2 === 0 ? rawMaxFrequency : rawMaxFrequency - 1;
          const frequency = options?.frequency !== undefined ? Math.max(2, Math.min(maxFrequency, options.frequency === "auto" ? maxFrequency : Math.round(options.frequency * 2))) : 2;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const halfDistance = distance / 2;
          const amplitude = curvinessFactor * halfDistance;
          const mirrorDirection = mirror ? -1 : 1;
          const directionX = dx / distance;
          const directionY = dy / distance;
          for (let offset = 1; offset < possibleSteps + 1; offset++) {
            const t = offset / (possibleSteps + 1);
            const sineWaveOffset = Math.sin(t * Math.PI * frequency) * amplitude * mirrorDirection;
            const intermediateX = Math.round(initialX + t * dx + directionY * sineWaveOffset);
            const intermediateY = Math.round(initialY + t * dy - directionX * sineWaveOffset);
            const correctedDelayPerPosition = delayPerPosition + (offset % correctionDelayOccurrence === 0 ? 1 : 0);
            promises.push(time.waitAsync(correctedDelayPerPosition + accumulatedDelay, () => setCursorPos(intermediateX, intermediateY)));
            accumulatedDelay += correctedDelayPerPosition;
          }
          break;
        }
        /* case "circle": {
          // Determine radius using Euclidean distance
          const diameter = Math.sqrt(dx * dx + dy * dy);
          const radius = Math.round(diameter / 2);

          // Determine midpoint
          const midpointX = (initialX + newX) / 2;
          const midpointY = (initialY + newY) / 2;

          // Calculate the angle increment for each step
          const startAngle = Math.atan2(initialY - midpointY, initialX - midpointX); // Angle of initial point
          const endAngle = Math.atan2(newY - midpointY, newX - midpointX); // Angle of final point

          const direction = mirror ? -1 : 1;

          // Half-circle movement implies that the arc is in a 180-degree range
          const angleDifference = (endAngle - startAngle) * direction;

          // Ensure the angle difference is between -π and π (normalize angle range)
          const angleStep = angleDifference / (possibleSteps + 1);

          for (let offset = 1; offset < possibleSteps + 1; offset++) {
            const angle = startAngle + offset * angleStep;
            // Calculate intermediate point on the arc
            const intermediateX = Math.round(midpointX + radius * Math.cos(angle));
            const intermediateY = Math.round(midpointY + radius * Math.sin(angle));

            // Set the cursor position at computed position and at given delay
            const correctedDelayPerPosition = delayPerPosition + (offset % correctionDelayOccurrence === 0 ? 1 : 0);
            promises.push(time.waitAsync(correctedDelayPerPosition + accumulatedDelay, () => setCursorPos(intermediateX, intermediateY)));
            accumulatedDelay += correctedDelayPerPosition;
          }
          break;
        } */
        default:
          break;
      }
    }
    promises.push(time.waitAsync(delay, () => setCursorPos(newX, newY)));
    return Promise.all(promises);
  },
  /**
   * @description Simulate mouse left button press and/or release.
   */
  left: {
    /**
     * @description Simulate mouse left button press.
     *
     * @returns A promise which resolves after the mouse left button is pressed.
     *
     * ---
     * @example
     *
     * // Press [Left Mouse Button] immediately
     * mouse.left.down();
     *
     * // Press [Left Mouse Button] in 1 second
     * await mouse.left.down({ delay: 1000 });
     */
    async down(options?: { delay?: number }) {
      const delay = Math.max(0, Math.floor(options?.delay ?? 0));
      return time.waitAsync(delay, leftClickDown);
    },
    /**
     * @description Simulate mouse left button release.
     *
     * @returns A promise which resolves after the mouse left button is released.
     *
     * ---
     * @example
     *
     * // Release [Left Mouse Button] immediately
     * mouse.left.up();
     *
     * // Release [Left Mouse Button] in 1 second
     * await mouse.left.up({ delay: 1000 });
     */
    async up(options?: { delay?: number }) {
      const delay = Math.max(0, Math.floor(options?.delay ?? 0));
      return time.waitAsync(delay, leftClickUp);
    },
    /**
     * @description Simulate mouse left button click (press then release).
     *
     * @returns A promise which resolves after the mouse left button is clicked.
     *
     * ---
     * @example
     *
     * // Click [Left Mouse Button] immediately
     * mouse.left.click();
     *
     * // Click [Left Mouse Button] in 1 second
     * await mouse.left.click({ delay: 1000 });
     */
    async click(options?: { delay?: number }) {
      const delay = Math.max(0, Math.floor(options?.delay ?? 0)) / 2;
      await this.down({ delay });
      await this.up({ delay });
    }
  },
  /**
   * @description Simulate mouse middle button press and/or release.
   */
  middle: {
    /**
     * @description Simulate mouse middle button press.
     *
     * @returns A promise which resolves after the mouse middle button is pressed.
     *
     * ---
     * @example
     *
     * // Press [Middle Mouse Button] immediately
     * mouse.middle.down();
     *
     * // Press [Middle Mouse Button] in 1 second
     * await mouse.middle.down({ delay: 1000 });
     */
    async down(options?: { delay?: number }) {
      const delay = Math.max(0, Math.floor(options?.delay ?? 0));
      return time.waitAsync(delay, mouseWheelPressDown);
    },
    /**
     * @description Simulate mouse middle button release.
     *
     * @returns A promise which resolves after the mouse middle button is released.
     *
     * ---
     * @example
     *
     * // Release [Middle Mouse Button] immediately
     * mouse.middle.up();
     *
     * // Release [Middle Mouse Button] in 1 second
     * await mouse.middle.up({ delay: 1000 });
     */
    async up(options?: { delay?: number }) {
      const delay = Math.max(0, Math.floor(options?.delay ?? 0));
      return time.waitAsync(delay, mouseWheelPressUp);
    },
    /**
     * @description Simulate mouse middle button click (press then release).
     *
     * @returns A promise which resolves after the mouse middle button is clicked.
     *
     * ---
     * @example
     *
     * // Click [Middle Mouse Button] immediately
     * mouse.middle.click();
     *
     * // Click [Middle Mouse Button] in 1 second
     * await mouse.middle.click({ delay: 1000 });
     */
    async click(options?: { delay?: number }) {
      const delay = Math.max(0, Math.floor(options?.delay ?? 0)) / 2;
      await this.down({ delay });
      await this.up({ delay });
    }
  },
  /**
   * @description Simulate mouse right button press and/or release.
   */
  right: {
    /**
     * @description Simulate mouse right button press.
     *
     * @returns A promise which resolves after the mouse right button is pressed.
     *
     * ---
     * @example
     *
     * // Press [Right Mouse Button] immediately
     * mouse.right.down();
     *
     * // Press [Right Mouse Button] in 1 second
     * await mouse.right.down({ delay: 1000 });
     */
    async down(options?: { delay?: number }) {
      const delay = Math.max(0, Math.floor(options?.delay ?? 0));
      return time.waitAsync(delay, rightClickDown);
    },
    /**
     * @description Simulate mouse right button release.
     *
     * @returns A promise which resolves after the mouse right button is released.
     *
     * ---
     * @example
     *
     * // Release [Right Mouse Button] immediately
     * mouse.right.up();
     *
     * // Release [Right Mouse Button] in 1 second
     * await mouse.right.up({ delay: 1000 });
     */
    async up(options?: { delay?: number }) {
      const delay = Math.max(0, Math.floor(options?.delay ?? 0));
      return time.waitAsync(delay, rightClickUp);
    },
    /**
     * @description Simulate mouse right button click (press then release).
     *
     * @returns A promise which resolves after the mouse right button is clicked.
     *
     * ---
     * @example
     *
     * // Click [Right Mouse Button] immediately
     * mouse.right.click();
     *
     * // Click [Right Mouse Button] in 1 second
     * await mouse.right.click({ delay: 1000 });
     */
    async click(options?: { delay?: number }) {
      const delay = Math.max(0, Math.floor(options?.delay ?? 0)) / 2;
      await this.down({ delay });
      await this.up({ delay });
    }
  },
  /**
   * @description Simulate mouse wheel scroll down or up.
   */
  scroll: {
    /**
     * @description Simulate mouse wheel scroll down.
     *
     * @param scrollAmount Amount of wheel deltas to scroll down. If unset, the default mouse wheel scroll amount will be used.
     * @returns A promise which resolves after the mouse wheel is scrolled down.
     *
     * ---
     * @example
     *
     * // Scroll down 120 wheel deltas (commonly 1 scroll) immediately
     * mouse.scroll.down();
     *
     * // Scroll down 240 wheel deltas (commonly 2 scrolls) immediately
     * mouse.scroll.down(240);
     *
     * // Scroll down 120 wheel deltas (commonly 1 scroll) in 1 second
     * await mouse.scroll.down(undefined, { delay: 1000 });
     *
     * // Scroll down 240 wheel deltas (commonly 2 scrolls) in 1 second
     * await mouse.scroll.down(240, { delay: 1000 });
     */
    async down(scrollAmount?: number, options?: { delay?: number }) {
      const delay = Math.max(0, Math.floor(options?.delay ?? 0));
      return time.waitAsync(delay, () => mouseWheelScrollDown(scrollAmount));
    },
    /**
     * @description Simulate mouse wheel scroll up.
     *
     * @param scrollAmount Amount of wheel deltas to scroll up. If unset, the default mouse wheel scroll amount will be used.
     * @returns A promise which resolves after the mouse wheel is scrolled up.
     *
     * ---
     * @example
     *
     * // Scroll up 120 wheel deltas (commonly 1 scroll) immediately
     * mouse.scroll.up();
     *
     * // Scroll up 240 wheel deltas (commonly 2 scrolls) immediately
     * mouse.scroll.up(240);
     *
     * // Scroll up 120 wheel deltas (commonly 1 scroll) in 1 second
     * await mouse.scroll.up(undefined, { delay: 1000 });
     *
     * // Scroll up 240 wheel deltas (commonly 2 scrolls) in 1 second
     * await mouse.scroll.up(240, { delay: 1000 });
     */
    async up(scrollAmount?: number, options?: { delay?: number }) {
      const delay = Math.max(0, Math.floor(options?.delay ?? 0));
      return time.waitAsync(delay, () => mouseWheelScrollUp(scrollAmount));
    }
  },
  /**
   * @description Mouse events listening manager.
   */
  events: {
    /**
     * @description Listen to the given mouse events.
     *
     * @param actions Mouse actions to listen to.
     * @returns Listener builder.
     *
     * ---
     * @example
     * // Listen to all mouse left and right button events
     * mouse.events.on("left", "right").listen((mouseEvent, listenerController) => console.log(mouseEvent));
     *
     * // Listen to all mouse left button press events
     * mouse.events.on("left down").listen((mouseEvent, listenerController) => console.log(mouseEvent));
     *
     * // Listen to all mouse movement events
     * mouse.events.on("move").listen((mouseEvent, listenerController) => console.log(mouseEvent));
     */
    on(...actions: Array<`${MouseInput}` | `${MouseInput} ${MouseState}`>) {
      const mouseActions: MouseAction[] = actions.map((action) => {
        const parts = action.split(" ");
        const input = parts[0] as MouseInput;
        const state = parts[1] as MouseState | undefined;
        return { input, state };
      });
      return {
        /**
         * @description Attach the given mouse listener and start listening to the given mouse events.
         *
         * @param mouseListener The mouse listener callback.
         * @returns The mouse listener controller.
         *
         * ---
         * @example
         * // Start listening to all mouse left and right button events
         * mouse.events.on("left", "right").listen((mouseEvent, listenerController) => console.log(mouseEvent));
         *
         * // Start listening to all mouse left button press events
         * mouse.events.on("left down").listen((mouseEvent, listenerController) => console.log(mouseEvent));
         *
         * // Start listening to all mouse movement events
         * mouse.events.on("move").listen((mouseEvent, listenerController) => console.log(mouseEvent));
         */
        listen(mouseListener: MouseListener) {
          const mouseListenerScope: MouseListenerScope = {
            type: "mouse",
            listener: mouseListener,
            controller: {
              pause() {
                mouseListenerScope.isPaused = true;
                return this;
              },
              resume() {
                mouseListenerScope.isPaused = false;
                return this;
              },
              off() {
                const listenerIndex = mouseListeners.findIndex((mouseListener) => mouseListener.listener === mouseListenerScope.listener);
                if (listenerIndex !== -1) {
                  mouseListeners.splice(listenerIndex, 1);
                }
                if (shouldStopMainListener()) {
                  stopEventListener();
                }
              }
            },
            when: mouseActions,
            isPaused: false,
            isRunning: false
          };
          mouseListeners.push(mouseListenerScope);
          if (shouldStartMainListener()) {
            startEventListener(mainListener);
          }
          return mouseListenerScope.controller;
        }
      };
    },
    /**
     * @description Attach the given mouse listener and start listening to all mouse events.
     *
     * @param mouseListener The mouse listener callback.
     * @returns The mouse listener controller.
     *
     * ---
     * @example
     * mouse.events.all((mouseEvent, listenerController) => console.log(mouseEvent));
     */
    all(mouseListener: MouseListener) {
      return this.on().listen(mouseListener);
    },
    /**
     * @description Resume the given paused mouse listener.
     *
     * @param listener The mouse listener to resume.
     *
     * ---
     * @example
     * // Listen to all mouse left and right button events
     * const mouseListener = (mouseEvent, listenerController) => console.log(mouseEvent);
     * const mouseListenerController = mouse.events
     *   .on("left", "right")
     *   .listen(mouseListener);
     * // Pause the mouse listener
     * mouse.events.pause(mouseListener);
     * // Resume the mouse listener
     * mouse.events.resume(mouseListener);
     */
    resume(listener: MouseListener) {
      const listenerScope = mouseListeners.find((mouseListener) => mouseListener.listener === listener);
      if (listenerScope) {
        listenerScope.isPaused = false;
      }
    },
    /**
     * @description Pause the given active mouse listener.
     *
     * @param listener The mouse listener to pause.
     *
     * ---
     * @example
     * // Listen to all mouse left and right button events
     * const mouseListener = (mouseEvent, listenerController) => console.log(mouseEvent);
     * const mouseListenerController = mouse.events
     *   .on("left", "right")
     *   .listen(mouseListener);
     * // Pause the mouse listener
     * mouse.events.pause(mouseListener);
     */
    pause(listener: MouseListener) {
      const listenerScope = mouseListeners.find((mouseListener) => mouseListener.listener === listener);
      if (listenerScope) {
        listenerScope.isPaused = true;
      }
    },
    /**
     * @description Stop and detach the given mouse listener.
     *
     * @param listener The mouse listener to stop and detach.
     *
     * ---
     * @example
     * // Listen to all mouse left and right button events
     * const mouseListener = (mouseEvent, listenerController) => console.log(mouseEvent);
     * const mouseListenerController = mouse.events
     *   .on("left", "right")
     *   .listen(mouseListener);
     * // Stop and detach the mouse listener
     * mouse.events.off(mouseListener);
     */
    off(listener: MouseListener) {
      const listenerIndex = mouseListeners.findIndex((mouseListener) => mouseListener.listener === listener);
      if (listenerIndex !== -1) {
        mouseListeners.splice(listenerIndex, 1);
      }
      if (shouldStopMainListener()) {
        stopEventListener();
      }
    },
    /**
     * @description Suppress the given mouse inputs.
     * Mouse listeners will not be affected and will still receive the events.
     *
     * **Caution**: these inputs will not have any effect until you `unsuppress` them.
     * Make sure not to be soft locked!
     *
     * @param actions Mouse actions to suppress.
     *
     * ---
     * @example
     * // Suppress all mouse left and right button events
     * mouse.events.suppress("left", "right");
     *
     * // Suppress all mouse left button press events
     * mouse.events.suppress("left down");
     *
     * // Suppress all mouse movement events
     * mouse.events.suppress("move");
     */
    suppress(...actions: Array<`${MouseInput}` | `${MouseInput} ${MouseState}`>) {
      if (actions.length === 0) {
        return;
      }
      const mouseActions: MouseAction[] = actions.map((action) => {
        const parts = action.split(" ");
        const input = parts[0] as MouseInput;
        const state = parts[1] as MouseState | undefined;
        return { input, state };
      });
      const mappedInputsStates: Array<[number, Array<number>]> = [];
      for (const mouseAction of mouseActions) {
        let mappedInput = -1;
        switch (mouseAction.input) {
          case "move": mappedInput = 0; break;
          case "left": mappedInput = 1; break;
          case "right": mappedInput = 2; break;
          case "middle": mappedInput = 3; break;
          case "wheel": mappedInput = 4; break;
          default: break;
        }
        const mappedStates = [];
        switch (mouseAction.state) {
          case "down": mappedStates.push(0); break;
          case "up": mappedStates.push(1); break;
          case "neutral": mappedStates.push(2); break;
          default: mappedStates.push(0, 1, 2); break;
        }
        mappedInputsStates.push([mappedInput, mappedStates]);
      }
      suppressInputEvents(0, mappedInputsStates);
    },
    /**
     * @description Re-enable the given suppressed mouse inputs.
     *
     * @param actions Mouse actions to unsuppress.
     *
     * ---
     * @example
     * // Unsuppress all mouse left and right button events
     * mouse.events.unsuppress("left", "right");
     *
     * // Unsuppress all mouse left button press events
     * mouse.events.unsuppress("left down");
     *
     * // Unsuppress all mouse movement events
     * mouse.events.unsuppress("move");
     */
    unsuppress(...actions: Array<`${MouseInput}` | `${MouseInput} ${MouseState}`>) {
      if (actions.length === 0) {
        return;
      }
      const mouseActions: MouseAction[] = actions.map((action) => {
        const parts = action.split(" ");
        const input = parts[0] as MouseInput;
        const state = parts[1] as MouseState | undefined;
        return { input, state };
      });
      const mappedInputsStates: Array<[number, Array<number>]> = [];
      for (const mouseAction of mouseActions) {
        let mappedInput = -1;
        switch (mouseAction.input) {
          case "move": mappedInput = 0; break;
          case "left": mappedInput = 1; break;
          case "right": mappedInput = 2; break;
          case "middle": mappedInput = 3; break;
          case "wheel": mappedInput = 4; break;
          default: break;
        }
        const mappedStates = [];
        switch (mouseAction.state) {
          case "down": mappedStates.push(0); break;
          case "up": mappedStates.push(1); break;
          case "neutral": mappedStates.push(2); break;
          default: mappedStates.push(0, 1, 2); break;
        }
        mappedInputsStates.push([mappedInput, mappedStates]);
      }
      unsuppressInputEvents(0, mappedInputsStates);
    }
  },
  /**
   * @description Mouse events recorder and replayer.
   */
  track: {
    /**
     * @description Record the given mouse actions and save them to a file.
     *
     * @param actions Mouse actions to record. If unset, all mouse events will be recorded.
     * @returns The mouse record file controller.
     *
     * ---
     * @example
     * // Record all mouse events
     * const mouseRecordController = mouse.track
     *   .record()
     *   .into("/path/to/mouse-record.act")
     *   .start();
     *
     * // Record all mouse left and right button events
     * const mouseRecordController = mouse.track
     *   .record("left", "right")
     *   .into("/path/to/mouse-record.act")
     *   .start();
     */
    record(...actions: Array<`${MouseInput}` | `${MouseInput} ${MouseState}`>) {
      return {
        /**
         * @description Create the mouse record file and return its start controller.
         *
         * @param filepath The file path to save the mouse actions to.
         * @returns The mouse record start controller.
         *
         * ---
         * @example
         * // Record all mouse events
         * const mouseRecordController = mouse.track
         *   .record()
         *   .into("/path/to/mouse-record.act")
         *   .start();
         *
         * // Record all mouse left and right button events
         * const mouseRecordController = mouse.track
         *   .record("left", "right")
         *   .into("/path/to/mouse-record.act")
         *   .start();
         */
        into(filepath: string) {
          return {
            /**
             * @description Start recording the given mouse actions into the given file.
             *
             * @returns The mouse record controller.
             *
             * ---
             * @example
             * // Record all mouse events
             * const mouseRecordController = mouse.track
             *   .record()
             *   .into("/path/to/mouse-record.act")
             *   .start();
             *
             * // Record all mouse left and right button events
             * const mouseRecordController = mouse.track
             *   .record("left", "right")
             *   .into("/path/to/mouse-record.act")
             *   .start();
             */
            start() {
              const mouseActions: MouseAction[] = actions.map((action) => {
                const parts = action.split(" ");
                const input = parts[0] as MouseInput;
                const state = parts[1] as MouseState | undefined;
                return { input, state };
              });
              const writeStream = filesystem.writeStream(filepath);
              const mouseRecorder: MouseRecorderScope = {
                type: "mouse",
                when: mouseActions,
                writeStream: writeStream,
                isPaused: false,
              };
              mouseRecorders.push(mouseRecorder);
              if (shouldStartMainListener()) {
                startEventListener(mainListener);
              }
              return {
                /**
                 * @description Pause the mouse recorder.
                 *
                 * @returns The mouse record controller.
                 *
                 * ---
                 * @example
                 * // Record all mouse events
                 * const mouseRecordController = mouse.track
                 *   .record()
                 *   .into("/path/to/mouse-record.act")
                 *   .start();
                 * // Pause the mouse recorder
                 * mouseRecordController.pause();
                 *
                 * // Record all mouse left and right button events
                 * const mouseRecordController = mouse.track
                 *   .record("left", "right")
                 *   .into("/path/to/mouse-record.act")
                 *   .start();
                 * // Pause the mouse recorder
                 * mouseRecordController.pause();
                 */
                pause() {
                  mouseRecorder.isPaused = true;
                  return this;
                },
                /**
                 * @description Resume the paused mouse recorder.
                 *
                 * @returns The mouse record controller.
                 *
                 * ---
                 * @example
                 * // Record all mouse events
                 * const mouseRecordController = mouse.track
                 *   .record()
                 *   .into("/path/to/mouse-record.act")
                 *   .start();
                 * // Pause the mouse recorder
                 * mouseRecordController.pause();
                 * // Resume the mouse recorder
                 * mouseRecordController.resume();
                 *
                 * // Record all mouse left and right button events
                 * const mouseRecordController = mouse.track
                 *   .record("left", "right")
                 *   .into("/path/to/mouse-record.act")
                 *   .start();
                 * // Pause the mouse recorder
                 * mouseRecordController.pause();
                 * // Resume the mouse recorder
                 * mouseRecordController.resume();
                 */
                resume() {
                  mouseRecorder.isPaused = false;
                  return this;
                },
                /**
                 * @description Stop the mouse recorder.
                 *
                 * ---
                 * @example
                 * // Record all mouse events
                 * const mouseRecordController = mouse.track
                 *   .record()
                 *   .into("/path/to/mouse-record.act")
                 *   .start();
                 * // Stop the mouse recorder
                 * mouseRecordController.stop();
                 */
                stop() {
                  mouseRecorder.writeStream.end();
                  const mouseRecorderIndex = mouseRecorders.indexOf(mouseRecorder);
                  if (mouseRecorderIndex !== -1) {
                    mouseRecorders.splice(mouseRecorderIndex, 1);
                  }
                  if (shouldStopMainListener()) {
                    stopEventListener();
                  }
                }
              };
            },
          };
        },
      };
    },
    /**
     * @description Replay all input events from a previous `track.record` file.
     *
     * @param filepath The file path of a previous `track.record` file.
     * @returns A promise that resolves when all the input events have been replayed.
     *
     * ---
     * @example
     * // Replay all mouse events
     * await mouse.track.replay("/path/to/mouse-record.act");
     *
     * // Replace all mouse events twice faster
     * await mouse.track.replay("/path/to/mouse-record.act", { speed: 2 });
     *
     * // Replace all mouse events twice slower
     * await mouse.track.replay("/path/to/mouse-record.act", { speed: 0.5 });
     */
    async replay(filepath: string, options?: { speed?: number }) {
      await input.track.replay(filepath, options);
    }
  },
};

/**
 * @description Common keyboard operations.
 */
export const keyboard = {
  /**
   * @description Press a single keyboard key.
   *
   * @param keyCodeOrKey The keyboard {@link https://learn.microsoft.com/fr-fr/windows/win32/inputdev/virtual-key-codes virtual key code} or key name to press.
   * @returns A promise which resolves after the key is pressed.
   *
   * ---
   * @example
   * // Press the "A" key immediately using its key name
   * keyboard.down("a");
   *
   * // Press the "A" key in 1 second using its key name
   * await keyboard.down("a", { delay: 1000 });
   *
   * // Press the "A" key immediately using its virtual key code
   * keyboard.down(0x41);
   *
   * // Press the "A" key in 1 second using its virtual key code
   * await keyboard.down(0x41, { delay: 1000 });
   */
  async down<T extends string>(keyCodeOrKey: number | CaseInsensitiveKey<T>, options?: { delay?: number }) {
    const delay = Math.max(0, Math.floor(options?.delay ?? 0));
    if (typeof keyCodeOrKey === 'number') {
      const keyCode = keyCodeOrKey;
      return time.waitAsync(delay, () => keyPressDown(keyCode));
    }
    const key = keyCodeOrKey;
    const keyCode = KeyMapper.toKeyCode(key);
    return time.waitAsync(delay, () => keyPressDown(keyCode));
  },
  /**
   * @description Release a single keyboard key.
   *
   * @param keyCodeOrKey The keyboard {@link https://learn.microsoft.com/fr-fr/windows/win32/inputdev/virtual-key-codes virtual key code} or key name to release.
   * @returns A promise which resolves after the key is released.
   *
   * ---
   * @example
   * // Release the "A" key immediately using its key name
   * keyboard.up("a");
   *
   * // Release the "A" key in 1 second using its key name
   * await keyboard.up("a", { delay: 1000 });
   *
   * // Release the "A" key immediately using its virtual key code
   * keyboard.up(0x41);
   *
   * // Release the "A" key in 1 second using its virtual key code
   * await keyboard.up(0x41, { delay: 1000 });
   */
  async up<T extends string>(keyCodeOrKey: number | CaseInsensitiveKey<T>, options?: { delay?: number }) {
    const delay = Math.max(0, Math.floor(options?.delay ?? 0));
    if (typeof keyCodeOrKey === 'number') {
      const keyCode = keyCodeOrKey;
      return time.waitAsync(delay, () => keyPressUp(keyCode));
    }
    const key = keyCodeOrKey;
    const keyCode = KeyMapper.toKeyCode(key);
    return time.waitAsync(delay, () => keyPressUp(keyCode));
  },
  /**
   * @description Tap (press then release) a single keyboard key.
   *
   * @param keyCodeOrKey The keyboard {@link https://learn.microsoft.com/fr-fr/windows/win32/inputdev/virtual-key-codes virtual key code} or key name to tap.
   * @returns A promise which resolves after the key is tapped.
   *
   * ---
   * @example
   * // Tap the "A" key immediately using its key name
   * keyboard.tap("a");
   *
   * // Tap the "A" key in 1 second using its key name
   * await keyboard.tap("a", { delay: 1000 });
   *
   * // Tap the "A" key immediately using its virtual key code
   * keyboard.tap(0x41);
   *
   * // Tap the "A" key in 1 second using its virtual key code
   * await keyboard.tap(0x41, { delay: 1000 });
   */
  async tap<T extends string>(keyCodeOrKey: number | CaseInsensitiveKey<T>, options?: { delay?: number }) {
    const delay = Math.max(0, Math.floor(options?.delay ?? 0)) / 2;
    await this.down(keyCodeOrKey, { delay });
    await this.up(keyCodeOrKey, { delay });
  },
  /**
   * @description Type the given text.
   *
   * @param text The text to type.
   * @returns A promise which resolves after the text has been typed.
   *
   * ---
   * @example
   * // Type "Hello, world!" immediately
   * keyboard.type("Hello, world!");
   *
   * // Type a multi-line text with unicode characters immediately
   * keyboard.type(`
   * Hello,
   * world!
   * 👋
   * `);
   *
   * // Type "Hello, world!" over 1 second
   * await keyboard.type("Hello, world!", { delay: 1000 });
   *
   * // Type a multi-line text with unicode characters over 1 second
   * await keyboard.type(`
   * Hello,
   * world!
   * 👋
   * `, { delay: 1000 });
   */
  async type(text: string, options?: { delay?: number }) {
    const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" }); // requires ES2022 support
    const characters = Array.from(segmenter.segment(text)).map((segmentData) => segmentData.segment);
    const delay = Math.max(0, Math.floor(options?.delay ?? 0)) / characters.length;
    let accumulatedDelay = 0;
    const promises = [];
    for (const character of characters) {
      accumulatedDelay += delay;
      promises.push(
        time.waitAsync(accumulatedDelay, () => typeUnicodeCharacter(character))
      );
    }
    await Promise.all(promises);
  },
  /**
   * @description Keyboard events listening manager.
   */
  events: {
    /**
     * @description Listen to the given keyboard events.
     *
     * @param actions The keyboard actions to listen to.
     * @returns Listener builder.
     *
     * ---
     * @example
     * // Listen to all keyboard "A" and "B" key events
     * keyboard.events.on("a", "b").listen((keyboardEvent, listenerController) => console.log(keyboardEvent));
     *
     * // Listen to all keyboard "A" key down events
     * keyboard.events.on("a down").listen((keyboardEvent, listenerController) => console.log(keyboardEvent));
     */
    on(...actions: Array<`${CaseInsensitiveKey<any>}` | `${CaseInsensitiveKey<any>} ${KeyState}`>) {
      const keyboardActions: KeyAction[] = actions.map((action) => {
        const parts = action.split(" ");
        const input = KeyMapper.toKeyCode(KeyFormatter.format(parts[0]));
        const state = parts[1] as KeyState | undefined;
        return { input, state };
      });
      return {
        /**
         * @description Attach the given keyboard listener and start listening to the given keyboard events.
         *
         * @param keyboardListener The keyboard listener callback.
         * @returns The keyboard listener controller.
         *
         * ---
         * @example
         * // Listen to all keyboard "A" and "B" key events
         * keyboard.events.on("a", "b").listen((keyboardEvent, listenerController) => console.log(keyboardEvent));
         *
         * // Listen to all keyboard "A" key down events
         * keyboard.events.on("a down").listen((keyboardEvent, listenerController) => console.log(keyboardEvent));
         */
        listen(keyboardListener: KeyboardListener) {
          const keyboardListenerScope: KeyboardListenerScope = {
            type: "keyboard",
            listener: keyboardListener,
            controller: {
              pause() {
                keyboardListenerScope.isPaused = true;
                return this;
              },
              resume() {
                keyboardListenerScope.isPaused = false;
                return this;
              },
              off() {
                const listenerIndex = keyboardListeners.findIndex((keyboardListener) => keyboardListener.listener === keyboardListenerScope.listener);
                if (listenerIndex !== -1) {
                  keyboardListeners.splice(listenerIndex, 1);
                }
                if (shouldStopMainListener()) {
                  stopEventListener();
                }
              }
            },
            when: keyboardActions,
            isPaused: false,
            isRunning: false
          };
          keyboardListeners.push(keyboardListenerScope);
          if (shouldStartMainListener()) {
            startEventListener(mainListener);
          }
          return keyboardListenerScope.controller;
        }
      };
    },
    /**
     * @description Attach the given keyboard listener and start listening to all keyboard events.
     *
     * @param keyboardListener The keyboard listener callback.
     * @returns The keyboard listener controller.
     *
     * ---
     * @example
     * keyboard.events.all((keyboardEvent, listenerController) => console.log(keyboardEvent));
     */
    all(keyboardListener: KeyboardListener) {
      return this.on().listen(keyboardListener);
    },
    /**
     * @description Resume the given paused keyboard listener.
     *
     * @param listener The keyboard listener to resume.
     *
     * ---
     * @example
     * // Listen to all keyboard "A" and "B" key events
     * const keyboardListener = (keyboardEvent, listenerController) => console.log(keyboardEvent);
     * const keyboardListenerController = keyboard.events
     *   .on("a", "b")
     *   .listen(keyboardListener);
     * // Pause the keyboard listener
     * keyboard.events.pause(keyboardListener);
     * // Resume the keyboard listener
     * keyboard.events.resume(keyboardListener);
     */
    resume(listener: KeyboardListener) {
      const listenerScope = keyboardListeners.find((keyboardListener) => keyboardListener.listener === listener);
      if (listenerScope) {
        listenerScope.isPaused = false;
      }
    },
    /**
     * @description Pause the given keyboard listener.
     *
     * @param listener The keyboard listener to pause.
     *
     * ---
     * @example
     * // Listen to all keyboard "A" and "B" key events
     * const keyboardListener = (keyboardEvent, listenerController) => console.log(keyboardEvent);
     * const keyboardListenerController = keyboard.events
     *   .on("a", "b")
     *   .listen(keyboardListener);
     * // Pause the keyboard listener
     * keyboard.events.pause(keyboardListener);
     */
    pause(listener: KeyboardListener) {
      const listenerScope = keyboardListeners.find((keyboardListener) => keyboardListener.listener === listener);
      if (listenerScope) {
        listenerScope.isPaused = true;
      }
    },
    /**
     * @description Stop and detach the given keyboard listener.
     *
     * @param listener The keyboard listener to stop and detach.
     *
     * ---
     * @example
     * // Listen to all keyboard "A" and "B" key events
     * const keyboardListener = (keyboardEvent, listenerController) => console.log(keyboardEvent);
     * const keyboardListenerController = keyboard.events
     *   .on("a", "b")
     *   .listen(keyboardListener);
     * // Stop and detach the keyboard listener
     * keyboard.events.off(keyboardListener);
     */
    off(listener: KeyboardListener) {
      const listenerIndex = keyboardListeners.findIndex((keyboardListener) => keyboardListener.listener === listener);
      if (listenerIndex !== -1) {
        keyboardListeners.splice(listenerIndex, 1);
      }
      if (shouldStopMainListener()) {
        stopEventListener();
      }
    },
    /**
     * @description Suppress the given keyboard actions.
     * Keyboard listeners will not be affected and will still receive the events.
     *
     * **Caution**: these inputs will not have any effect until you `unsuppress` them.
     * Make sure not to be soft locked!
     *
     * @param actions Keyboard actions to suppress.
     *
     * ---
     * @example
     * // Suppress all keyboard "A" and "B" key events
     * keyboard.events.suppress("a", "b");
     *
     * // Suppress all keyboard "A" key down events
     * keyboard.events.suppress("a down");
     */
    suppress(...actions: Array<`${CaseInsensitiveKey<any>}` | `${CaseInsensitiveKey<any>} ${KeyState}`>) {
      if (actions.length === 0) {
        return;
      }
      const keyboardActions: KeyAction[] = actions.map((action) => {
        const parts = action.split(" ");
        const input = KeyMapper.toKeyCode(KeyFormatter.format(parts[0]));
        const state = parts[1] as KeyState | undefined;
        return { input, state };
      });
      const mappedInputsStates: Array<[number, Array<number>]> = [];
      for (const keyboardAction of keyboardActions) {
        const mappedInput = keyboardAction.input;
        const mappedStates = [];
        switch (keyboardAction.state) {
          case "down": mappedStates.push(0); break;
          case "up": mappedStates.push(1); break;
          default: mappedStates.push(0, 1); break;
        }
        mappedInputsStates.push([mappedInput, mappedStates]);
      }
      suppressInputEvents(1, mappedInputsStates);
    },
    /**
     * @description Re-enable the given suppressed keyboard inputs.
     *
     * @param actions Keyboard actions to unsuppress.
     *
     * ---
     * @example
     * // Unsuppress all keyboard "A" and "B" key events
     * keyboard.events.unsuppress("a", "b");
     *
     * // Unsuppress all keyboard "A" key down events
     * keyboard.events.unsuppress("a down");
     */
    unsuppress(...actions: Array<`${CaseInsensitiveKey<any>}` | `${CaseInsensitiveKey<any>} ${KeyState}`>) {
      if (actions.length === 0) {
        return;
      }
      const keyboardActions: KeyAction[] = actions.map((action) => {
        const parts = action.split(" ");
        const input = KeyMapper.toKeyCode(KeyFormatter.format(parts[0]));
        const state = parts[1] as KeyState | undefined;
        return { input, state };
      });
      const mappedInputsStates: Array<[number, Array<number>]> = [];
      for (const keyboardAction of keyboardActions) {
        const mappedInput = keyboardAction.input;
        const mappedStates = [];
        switch (keyboardAction.state) {
          case "down": mappedStates.push(0); break;
          case "up": mappedStates.push(1); break;
          default: mappedStates.push(0, 1); break;
        }
        mappedInputsStates.push([mappedInput, mappedStates]);
      }
      unsuppressInputEvents(1, mappedInputsStates);
    }
  },
  /**
   * @description Keyboard events recorder and replayer.
   */
  track: {
    /**
     * @description Record the given keyboard actions and save them to a file.
     *
     * @param actions Keyboard actions to record. If unset, all keyboard events will be recorded.
     * @returns The keyboard record file controller.
     *
     * ---
     * @example
     * // Record all keyboard events
     * const keyboardRecordController = keyboard.track
     *   .record()
     *   .into("/path/to/keyboard-record.act")
     *   .start();
     *
     * // Record all keyboard "A" and "B" key events
     * const keyboardRecordController = keyboard.track
     *   .record("a", "b")
     *   .into("/path/to/keyboard-record.act")
     *   .start();
     */
    record(...actions: Array<`${CaseInsensitiveKey<any>}` | `${CaseInsensitiveKey<any>} ${KeyState}`>) {
      return {
        /**
         * @description Create the keyboard record file and return its start controller.
         *
         * @param filepath The file path to save the keyboard actions to.
         * @returns The keyboard record start controller.
         *
         * ---
         * @example
         * // Record all keyboard events
         * const keyboardRecordController = keyboard.track
         *   .record()
         *   .into("/path/to/keyboard-record.act")
         *   .start();
         *
         * // Record all keyboard "A" and "B" key events
         * const keyboardRecordController = keyboard.track
         *   .record("a", "b")
         *   .into("/path/to/keyboard-record.act")
         *   .start();
         */
        into(filepath: string) {
          return {
            /**
             * @description Start recording the given keyboard actions into the given file.
             *
             * @returns The keyboard record controller.
             *
             * ---
             * @example
             * // Record all keyboard events
             * const keyboardRecordController = keyboard.track
             *   .record()
             *   .into("/path/to/keyboard-record.act")
             *   .start();
             *
             * // Record all keyboard "A" and "B" key events
             * const keyboardRecordController = keyboard.track
             *   .record("a", "b")
             *   .into("/path/to/keyboard-record.act")
             *   .start();
             */
            start() {
              const keyboardActions: KeyAction[] = actions.map((action) => {
                const parts = action.split(" ");
                const input = KeyMapper.toKeyCode(KeyFormatter.format(parts[0]));
                const state = parts[1] as KeyState | undefined;
                return { input, state };
              });
              const writeStream = filesystem.writeStream(filepath);
              const keyboardRecorder: KeyboardRecorderScope = {
                type: "keyboard",
                when: keyboardActions,
                writeStream: writeStream,
                isStarted: false,
                isPaused: false,
              };
              keyboardRecorders.push(keyboardRecorder);
              if (shouldStartMainListener()) {
                startEventListener(mainListener);
              }
              return {
                /**
                 * @description Pause the keyboard recorder.
                 *
                 * @returns The keyboard record controller.
                 *
                 * ---
                 * @example
                 * // Record all keyboard events
                 * const keyboardRecordController = keyboard.track
                 *   .record()
                 *   .into("/path/to/keyboard-record.act")
                 *   .start();
                 * // Pause the keyboard recorder
                 * keyboardRecordController.pause();
                 *
                 * // Record all keyboard "A" and "B" key events
                 * const keyboardRecordController = keyboard.track
                 *   .record("a", "b")
                 *   .into("/path/to/keyboard-record.act")
                 *   .start();
                 * // Pause the keyboard recorder
                 * keyboardRecordController.pause();
                 */
                pause() {
                  keyboardRecorder.isPaused = true;
                  return this;
                },
                /**
                 * @description Resume the paused keyboard recorder.
                 *
                 * @returns The keyboard record controller.
                 *
                 * ---
                 * @example
                 * // Record all keyboard events
                 * const keyboardRecordController = keyboard.track
                 *   .record()
                 *   .into("/path/to/keyboard-record.act")
                 *   .start();
                 * // Pause the keyboard recorder
                 * keyboardRecordController.pause();
                 * // Resume the keyboard recorder
                 * keyboardRecordController.resume();
                 *
                 * // Record all keyboard "A" and "B" key events
                 * const keyboardRecordController = keyboard.track
                 *   .record("a", "b")
                 *   .into("/path/to/keyboard-record.act")
                 *   .start();
                 * // Pause the keyboard recorder
                 * keyboardRecordController.pause();
                 * // Resume the keyboard recorder
                 * keyboardRecordController.resume();
                 */
                resume() {
                  keyboardRecorder.isPaused = false;
                  return this;
                },
                /**
                 * @description Stop the keyboard recorder.
                 *
                 * ---
                 * @example
                 * // Record all keyboard events
                 * const keyboardRecordController = keyboard.track
                 *   .record()
                 *   .into("/path/to/keyboard-record.act")
                 *   .start();
                 * // Stop the keyboard recorder
                 * keyboardRecordController.stop();
                 *
                 * // Record all keyboard "A" and "B" key events
                 * const keyboardRecordController = keyboard.track
                 *   .record("a", "b")
                 *   .into("/path/to/keyboard-record.act")
                 *   .start();
                 * // Stop the keyboard recorder
                 * keyboardRecordController.stop();
                 */
                stop() {
                  keyboardRecorder.writeStream.end();
                  const keyboardRecorderIndex = keyboardRecorders.indexOf(keyboardRecorder);
                  if (keyboardRecorderIndex !== -1) {
                    keyboardRecorders.splice(keyboardRecorderIndex, 1);
                  }
                  if (shouldStopMainListener()) {
                    stopEventListener();
                  }
                },
              };
            },
          };
        },
      };
    },
    /**
     * @description Replay all input events from a previous `track.record` file.
     *
     * @param filepath The file path of a previous `track.record` file.
     * @returns A promise that resolves when all the input events have been replayed.
     *
     * ---
     * @example
     * // Replay all keyboard events
     * await keyboard.track.replay("/path/to/keyboard-record.act");
     *
     * // Replay all keyboard events twice faster
     * await keyboard.track.replay("/path/to/keyboard-record.act", { speed: 2 });
     *
     * // Replay all keyboard events twice slower
     * await keyboard.track.replay("/path/to/keyboard-record.act", { speed: 0.5 });
     */
    async replay(filepath: string, options?: { speed?: number }) {
      await input.track.replay(filepath, options);
    }
  },
};

/**
 * @description Screen information and interaction.
 */
export const screen = {
  /**
   * @description Get information for each available screen.
   * The first screen is the main monitor.
   *
   * @returns The list of available screens.
   *
   * ---
   * @example
   * const screens = screen.list();
   */
  list(): ScreenInfo[] {
    return getAvailableScreens();
  },
  /**
   * @description Screen pixel management.
   */
  pixel: {
    /**
     * @description Get the color of a pixel.
     * The pixel position is relative to the main monitor (with origin in top-left corner at 0,0).
     *
     * @param x Pixel X position. If unset, the current mouse X position will be used.
     * @param y Pixel Y position. If unset, the current mouse Y position will be used.
     * @returns The color of the pixel in RGB format.
     *
     * ---
     * @example
     * // Get the color of the pixel at the current mouse position
     * const color = screen.pixel.color();
     *
     * // Get the color of the pixel at a specific position
     * const color = screen.pixel.color(100, 100);
     */
    color(x?: number, y?: number): Color {
      return getPixelColor(x ?? mouse.x, y ?? mouse.y);
    },
  },
  /**
   * @description Take a screenshot and save it to a PNG file.
   *
   * @param x The top-left corner X position of the screenshot. If unset, the current mouse X position will be used.
   * @param y The top-left corner Y position of the screenshot. If unset, the current mouse Y position will be used.
   * @param width The width of the screenshot in pixels. If unset, the width of the main monitor will be used.
   * @param height The height of the screenshot in pixels. If unset, the height of the main monitor will be used.
   * @param filepath The file path to save the screenshot to. If unset, it will be saved in the current working directory as `screenshot_[year]-[month]-[day]_[hour]-[minute]-[second]-[millisecond].png`.
   * @returns The absolute filepath of the screenshot.
   *
   * ---
   * @example
   * // Take a screenshot of the main monitor
   * const screenshotFilepath = screen.shot();
   *
   * // Take a screenshot of a specific area
   * const screenshotFilepath = screen.shot(100, 100, 400, 200);
   *
   * // Take a screenshot and save it to a specific file
   * const screenshotFilepath = screen.shot(100, 100, 400, 200, "/path/to/screenshot.png");
   */
  shot(x?: number, y?: number, width?: number, height?: number, filepath?: string) {
    const mainMonitor = this.list()[0];
    const now = new Date();
    const defaultFilepath = `screenshot_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}-${String(now.getMinutes()).padStart(2, "0")}-${String(now.getSeconds()).padStart(2, "0")}-${String(now.getMilliseconds()).padStart(3, "0")}.png`;
    const absoluteFilePath = path.resolve(filepath ?? defaultFilepath);
    takeScreenshotToFile(x ?? mainMonitor.origin.x, y ?? mainMonitor.origin.y, width ?? mainMonitor.dimensions.width, height ?? mainMonitor.dimensions.height, absoluteFilePath);
    return absoluteFilePath;
  }
};

/**
 * @description Window information and interaction.
 */
export const window = {
  /**
   * @description Get information and manage each running application window.
   *
   * @returns The list of running application windows.
   *
   * ---
   * @example
   * // Get the list of running application windows
   * const windows = window.list();
   */
  list(): Window[] {
    const windowsInfo = listWindows();
    const windows = windowsInfo.map<Window>((windowInfo: WindowInfo) => {
      return {
        ...windowInfo,
        minimize() {
          if (this.isMinimized) {
            return true;
          }
          return minimizeWindow(this.id);
        },
        restore() {
          if (this.isRestored) {
            return true;
          }
          return restoreWindow(this.id);
        },
        maximize() {
          if (this.isMaximized) {
            return true;
          }
          return maximizeWindow(this.id);
        },
        close() {
          return closeWindow(this.id);
        },
        focus() {
          if (this.isFocused) {
            return true;
          }
          if (this.isMinimized) {
            return this.restore();
          }
          return focusWindow(this.id);
        },
        move(x?: number, y?: number, options?: { steps?: number | "auto", delay?: number, motion?: "linear" | "arc" | "wave", curvinessFactor?: number, mirror?: boolean, frequency?: number | "auto" }) {
          if (this.isMinimized || this.isMaximized) {
            this.restore();
          }
          const steps = options?.steps === "auto" ? Infinity : Math.max(0, Math.round(options?.steps ?? 0));
          const delay = Math.max(0, Math.floor(options?.delay ?? 0));
          const curvinessFactor = options?.curvinessFactor !== undefined ? Math.max(0, Math.min(1, options.curvinessFactor)) : 0.1618;
          const mirror = options?.mirror ?? false;
          const motion = options?.motion ?? "linear";
          const thisWindow = window.get(this.id);
          const initialX = thisWindow ? thisWindow.position.x : this.position.x;
          const initialY = thisWindow ? thisWindow.position.y : this.position.y;
          const newX = x ?? initialX;
          const newY = y ?? initialY;
          if (steps === 0 || delay === 0) {
            return time.waitAsync(delay, () => setWindowPosition(this.id, newX, newY));
          }
          //Calculate the line from start to end (the shortest diagonal)
          const dx = newX - initialX;
          const dy = newY - initialY;
          // Chebyshev distance
          const intermediatePositions = Math.max(0, Math.max(Math.abs(dx), Math.abs(dy)) - 1);
          const possibleSteps = Math.min(delay, steps, intermediatePositions);
          const preciseDelayPerPosition = delay / (possibleSteps + 1);
          const delayPerPosition = Math.floor(preciseDelayPerPosition);
          let accumulatedDelay = 0;
          const promises: Promise<void>[] = [];
          if (possibleSteps > 0) {
            const correctionDelayOccurrence = preciseDelayPerPosition !== delayPerPosition ? Math.ceil(1 / (preciseDelayPerPosition - delayPerPosition)) : Infinity;
            const directionX = Math.sign(dx);
            const directionY = Math.sign(dy);
            const stepX = dx / (possibleSteps + 1);
            const stepY = dy / (possibleSteps + 1);
            switch (motion) {
              case "linear": {
                for (let offset = 1; offset < possibleSteps + 1; offset++) {
                  const intermediateX = directionX !== 0 ? Math.round(initialX + offset * stepX) : newX;
                  const intermediateY = directionY !== 0 ? Math.round(initialY + offset * stepY) : newY;
                  const correctedDelayPerPosition = delayPerPosition + (offset % correctionDelayOccurrence === 0 ? 1 : 0);
                  promises.push(time.waitAsync(correctedDelayPerPosition + accumulatedDelay, () => setWindowPosition(this.id, intermediateX, intermediateY)));
                  accumulatedDelay += correctedDelayPerPosition;
                }
                break;
              }
              case "arc": {
                // Bézier curve
                const midpointX = (initialX + newX) / 2;
                const midpointY = (initialY + newY) / 2;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const perpendicularX = -dy / distance;
                const perpendicularY = dx / distance;
                const direction = mirror ? -1 : 1;
                const controlX = midpointX + curvinessFactor * distance * perpendicularX * direction;
                const controlY = midpointY + curvinessFactor * distance * perpendicularY * direction;
                for (let offset = 1; offset < possibleSteps + 1; offset++) {
                  const t = offset / (possibleSteps + 1);
                  let intermediateX = Math.round((1 - t) * (1 - t) * initialX + 2 * (1 - t) * t * controlX + t * t * newX);
                  let intermediateY = Math.round((1 - t) * (1 - t) * initialY + 2 * (1 - t) * t * controlY + t * t * newY);
                  const correctedDelayPerPosition = delayPerPosition + (offset % correctionDelayOccurrence === 0 ? 1 : 0);
                  promises.push(time.waitAsync(correctedDelayPerPosition + accumulatedDelay, () => setWindowPosition(this.id, intermediateX, intermediateY)));
                  accumulatedDelay += correctedDelayPerPosition;
                }
                break;
              }
              case "wave": {
                const rawMaxFrequency = Math.floor((possibleSteps + 1) / 30 / 2);
                const maxFrequency = rawMaxFrequency % 2 === 0 ? rawMaxFrequency : rawMaxFrequency - 1;
                const frequency = options?.frequency !== undefined ? Math.max(2, Math.min(maxFrequency, options.frequency === "auto" ? maxFrequency : Math.round(options.frequency * 2))) : 2;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const halfDistance = distance / 2;
                const amplitude = curvinessFactor * halfDistance;
                const mirrorDirection = mirror ? -1 : 1;
                const directionX = dx / distance;
                const directionY = dy / distance;
                for (let offset = 1; offset < possibleSteps + 1; offset++) {
                  const t = offset / (possibleSteps + 1);
                  const sineWaveOffset = Math.sin(t * Math.PI * frequency) * amplitude * mirrorDirection;
                  const intermediateX = Math.round(initialX + t * dx + directionY * sineWaveOffset);
                  const intermediateY = Math.round(initialY + t * dy - directionX * sineWaveOffset);
                  const correctedDelayPerPosition = delayPerPosition + (offset % correctionDelayOccurrence === 0 ? 1 : 0);
                  promises.push(time.waitAsync(correctedDelayPerPosition + accumulatedDelay, () => setWindowPosition(this.id, intermediateX, intermediateY)));
                  accumulatedDelay += correctedDelayPerPosition;
                }
                break;
              }
              /* case "circle": {
                // Determine radius using Euclidean distance
                const diameter = Math.sqrt(dx * dx + dy * dy);
                const radius = Math.round(diameter / 2);

                // Determine midpoint
                const midpointX = (initialX + newX) / 2;
                const midpointY = (initialY + newY) / 2;

                // Calculate the angle increment for each step
                const startAngle = Math.atan2(initialY - midpointY, initialX - midpointX); // Angle of initial point
                const endAngle = Math.atan2(newY - midpointY, newX - midpointX); // Angle of final point

                const direction = mirror ? -1 : 1;

                // Half-circle movement implies that the arc is in a 180-degree range
                const angleDifference = (endAngle - startAngle) * direction;

                // Ensure the angle difference is between -π and π (normalize angle range)
                const angleStep = angleDifference / (possibleSteps + 1);

                for (let offset = 1; offset < possibleSteps + 1; offset++) {
                  const angle = startAngle + offset * angleStep;
                  // Calculate intermediate point on the arc
                  const intermediateX = Math.round(midpointX + radius * Math.cos(angle));
                  const intermediateY = Math.round(midpointY + radius * Math.sin(angle));

                  // Set the cursor position at computed position and at given delay
                  const correctedDelayPerPosition = delayPerPosition + (offset % correctionDelayOccurrence === 0 ? 1 : 0);
                  promises.push(time.waitAsync(correctedDelayPerPosition + accumulatedDelay, () => setWindowPosition(this.id, intermediateX, intermediateY)));
                  accumulatedDelay += correctedDelayPerPosition;
                }
                break;
              } */
              default:
                break;
            }
          }
          promises.push(time.waitAsync(delay, () => setWindowPosition(this.id, newX, newY)));
          return Promise.all(promises);
        },
        resize(width?: number, height?: number) {
          if (this.isMinimized) {
            this.restore();
          }
          return setWindowDimensions(this.id, width ?? this.dimensions.width, height ?? this.dimensions.height);
        },
        bottom() {
          if (this.isMinimized) {
            this.restore();
          }
          return setWindowToBottom(this.id);
        },
        top() {
          if (this.isMinimized) {
            this.restore();
          }
          return setWindowToTop(this.id);
        },
        alwaysOnTop(shouldBeAlwaysOnTop: boolean = true) {
          if (this.isMinimized) {
            this.restore();
          }
          return setWindowToAlwaysOnTop(this.id, shouldBeAlwaysOnTop);
        }
      };
    });
    return windows;
  },
  /**
   * @description Get window information using its window ID, process ID, title, or executable file name.
   *
   * @param search The window ID, process ID, title, or executable file name of the window to search for.
   * @returns The matching window information and interaction functions, or `null` if not found.
   *
   * ---
   * @example
   * // Get window information using its window ID
   * const window = window.get(123);
   * // Get window information using its process ID
   * const window = window.get(456);
   * // Get window information using its title
   * const window = window.get("My App");
   * // Get window information using its executable file name
   * const window = window.get("myapp.exe");
   */
  get (search: number | string): Window | null {
    const windows = this.list();
    return windows.find((window) => (
      window.id === search ||
      window.pid === search ||
      window.title.toLowerCase().includes(search.toString().toLowerCase()) ||
      window.executableFile.includes(search.toString().toLowerCase())
    )) ?? null;
  }
};

/**
 * @description Common clipboard operations.
 */
export const clipboard = {
  /**
   * @description Copy text or a file to the clipboard.
   *
   * @param textOrFilePath The text or the existing file to copy to the clipboard.
   * @returns The text or the absolute filepath of the copied file.
   *
   * ---
   * @example
   * // Copy text to the clipboard
   * clipboard.copy("Hello world!");
   *
   * // Copy a file to the clipboard
   * clipboard.copy("/path/to/file.extension");
   */
  copy(textOrFilePath: string) {
    // if argument is a valid file path
    if (filesystem.exists(textOrFilePath)) {
      const filePath = textOrFilePath;
      const absoluteFilePath = path.resolve(filePath);
      copyFileToClipboard(absoluteFilePath);
      return absoluteFilePath;
    }
    const text = textOrFilePath;
    copyTextToClipboard(text);
    return text;
  },
  /**
   * @description Paste the content of the clipboard.
   *
   * ---
   * @example
   * clipboard.paste();
   */
  paste() {
    keyboard.down("ctrl");
    keyboard.tap("v");
    keyboard.up("ctrl");
  }
};

/**
 * @description Common time management operations.
 */
export const time = {
  /**
   * @description Put the current thread to sleep for the specified number of milliseconds.
   *
   * @param milliseconds  The number of milliseconds to sleep.
   * @returns Synchronously after the specified number of milliseconds.
   *
   * ---
   * @example
   * time.waitSync(1000);
   */
  waitSync(milliseconds?: number) {
    if (milliseconds && milliseconds > 0) {
      return sleep(milliseconds);
    }
  },
  /**
   * @description Asynchronous sleep for the specified number of milliseconds.
   *
   * @param milliseconds The number of milliseconds to sleep.
   * @param callback The callback function to execute after the specified number of milliseconds.
   * @returns A promise that resolves after the specified number of milliseconds and the callback execution.
   *
   * ---
   * @example
   * // Wait asynchronously for 1 second
   * await time.waitAsync(1000);
   *
   * // Wait asynchronously for 1 second and execute a callback function
   * await time.waitAsync(1000, () => console.log("At least 1 second has passed."));
   */
  async waitAsync(milliseconds?: number, callback?: Function) {
    if (milliseconds && milliseconds > 0) {
      return new Promise<void>((resolve, reject) => {
        setTimeout(async () => {
          if (callback) {
            await callback();
          }
          resolve();
        }, milliseconds);
      });
    }
    if (callback) {
      await callback();
    }
  },
  /**
   * @description Returns the stored time value in milliseconds since midnight, January 1, 1970 UTC.
   *
   * @returns The stored time value in milliseconds since midnight, January 1, 1970 UTC.
   *
   * ---
   * @example
   * const now = time.now();
   */
  now(): number {
    return (new Date()).getTime();
  },
};

/**
 * @description Artificial Intelligence based operations.
 */
export const ai = {
  /**
   * @description Artificial Intelligence algorithms for image processing.
   *
   * @param filepath The path to the image file to process.
   * @returns The image processing functions.
   *
   * ---
   * @example
   * // Perform OCR on an image
   * const text = ai.image("/path/to/image.png").text();
   */
  image(filepath: string) {
    if (!filesystem.exists(filepath)) {
      throw new Error(`File does not exist: ${filepath}`);
    }
    return {
      /**
       * @description Perform OCR (Optical Character Recognition) on an image to extract text from it.
       *
       * @param language The language to use for OCR. If unset, the default language will be used (Windows Settings > Time and Language > Language).
       * @returns The text extracted from the image.
       *
       * ---
       * @example
       * // Extract text from an image using system default language
       * const text = ai.image("/path/to/image.png").text();
       * // Extract text from an image using English
       * const text = ai.image("/path/to/image.png").text("en");
       * // Extract text from an image using French
       * const text = ai.image("/path/to/image.png").text("fr");
       * // Extract text from an image using German
       * const text = ai.image("/path/to/image.png").text("de");
       * // Extract text from an image using Spanish
       * const text = ai.image("/path/to/image.png").text("es");
       * // Extract text from an image using Italian
       * const text = ai.image("/path/to/image.png").text("it");
       * // Extract text from an image using Portuguese
       * const text = ai.image("/path/to/image.png").text("pt");
       * // Extract text from an image using Russian
       * const text = ai.image("/path/to/image.png").text("ru");
       * // Extract text from an image using Simplified Chinese
       * const text = ai.image("/path/to/image.png").text("zh-CN");
       * // Extract text from an image using Traditional Chinese
       * const text = ai.image("/path/to/image.png").text("zh-TW");
       * // Extract text from an image using Japanese
       * const text = ai.image("/path/to/image.png").text("ja");
       * // Extract text from an image using Korean
       * const text = ai.image("/path/to/image.png").text("ko");
       * // Extract text from an image using Arabic
       * const text = ai.image("/path/to/image.png").text("ar");
       */
      text(language?: string) {
        const absoluteFilePath = path.resolve(filepath);
        return performOcrOnImage(absoluteFilePath, language);
      }
    };
  }
};

/**
 * @description Global input operations.
 */
export const input = {
  /**
   * @description Input events listening manager.
   */
  events: {
    /**
     * @description Listen to the given keyboard and/or mouse events.
     *
     * @param actions Input actions to listen to.
     * @returns Listener builder.
     *
     * ---
     * @example
     * // Listen to all keyboard and mouse events
     * input.events.all((inputEvent, listenerController) => console.log(inputEvent));
     *
     * // Listen to all keyboard "A" key and mouse "left" button events
     * input.events.on("a", "left").listen((inputEvent, listenerController) => console.log(inputEvent));
     */
    on(...actions: Array<`${MouseInput}` | `${MouseInput} ${MouseState}` | `${CaseInsensitiveKey<any>}` | `${CaseInsensitiveKey<any>} ${KeyState}`>) {
      const inputActions: InputAction[] = actions.map((action) => {
        const parts = action.split(" ");
        const input = parts[0] as Input;
        if (["move", "left", "middle", "right", "wheel"].includes(input)) {
          const mouseType = "mouse";
          const mouseInput = input as MouseInput;
          const mouseState = parts[1] as MouseState | undefined;
          return { type: mouseType, input: mouseInput, state: mouseState };
        }
        const keyboardType = "keyboard";
        const keyboardInput = KeyMapper.toKeyCode(KeyFormatter.format(parts[0]));
        const keyboardState = parts[1] as KeyState | undefined;
        return { type: keyboardType, input: keyboardInput, state: keyboardState };
      });
      return {
        /**
         * @description Attach the given input listener and start listening to the given input events.
         *
         * @param inputListener The input listener callback.
         * @returns The input listener controller.
         *
         * ---
         * @example
         * // Listen to all keyboard and mouse events
         * input.events.all((inputEvent, listenerController) => console.log(inputEvent));
         *
         * // Listen to all keyboard "A" key and mouse "left" button events
         * input.events.on("a", "left").listen((inputEvent, listenerController) => console.log(inputEvent));
         */
        listen(inputListener: InputListener) {
          const inputListenerScope: InputListenerScope = {
            listener: inputListener,
            controller: {
              pause() {
                inputListenerScope.isPaused = true;
                return this;
              },
              resume() {
                inputListenerScope.isPaused = false;
                return this;
              },
              off() {
                const listenerIndex = inputListeners.findIndex((inputListener) => inputListener.listener === inputListenerScope.listener);
                if (listenerIndex !== -1) {
                  inputListeners.splice(listenerIndex, 1);
                }
                if (shouldStopMainListener()) {
                  stopEventListener();
                }
              }
            },
            when: inputActions,
            isPaused: false,
            isRunning: false
          };
          inputListeners.push(inputListenerScope);
          if (shouldStartMainListener()) {
            startEventListener(mainListener);
          }
          return inputListenerScope.controller;
        }
      };
    },
    /**
     * @description Attach the given input listener and start listening to all keyboard and mouse events.
     *
     * @param inputListener The input listener callback.
     * @returns The input listener controller.
     *
     * ---
     * @example
     * input.events.all((inputEvent, listenerController) => console.log(inputEvent));
     */
    all(inputListener: InputListener) {
      return this.on().listen(inputListener);
    },
    /**
     * @description Resume the given paused input listener.
     *
     * @param listener The input listener to resume.
     *
     * ---
     * @example
     * // Listen to all keyboard and mouse events
     * const inputListener = (inputEvent, listenerController) => console.log(inputEvent);
     * const inputListenerController = input.events
     *   .all(inputListener);
     * // Pause the input listener
     * input.events.pause(inputListener);
     * // Resume the input listener
     * input.events.resume(inputListener);
     */
    resume(listener: InputListener) {
      const listenerScope = inputListeners.find((inputListener) => inputListener.listener === listener);
      if (listenerScope) {
        listenerScope.isPaused = false;
      }
    },
    /**
     * @description Pause the given active input listener.
     *
     * @param listener The input listener to pause.
     *
     * ---
     * @example
     * // Listen to all keyboard and mouse events
     * const inputListener = (inputEvent, listenerController) => console.log(inputEvent);
     * const inputListenerController = input.events
     *   .all(inputListener);
     * // Pause the input listener
     * input.events.pause(inputListener);
     */
    pause(listener: InputListener) {
      const listenerScope = inputListeners.find((inputListener) => inputListener.listener === listener);
      if (listenerScope) {
        listenerScope.isPaused = true;
      }
    },
    /**
     * @description Stop and detach the given input listener.
     *
     * @param listener The input listener to stop and detach.
     *
     * ---
     * @example
     * // Listen to all keyboard and mouse events
     * const inputListener = (inputEvent, listenerController) => console.log(inputEvent);
     * const inputListenerController = input.events
     *   .all(inputListener);
     * // Stop and detach the input listener
     * input.events.off(inputListener);
     */
    off(listener: InputListener) {
      const listenerIndex = inputListeners.findIndex((inputListener) => inputListener.listener === listener);
      if (listenerIndex !== -1) {
        inputListeners.splice(listenerIndex, 1);
      }
      if (shouldStopMainListener()) {
        stopEventListener();
      }
    },
    /**
     * @description Suppress the given input events.
     * Input listeners will not be affected and will still receive the events.
     *
     * **Caution**: these inputs will not have any effect until you `unsuppress` them.
     * Make sure not to be soft locked!
     *
     * @param actions Input actions to suppress.
     *
     * ---
     * @example
     * // Suppress all keyboard "A" key and mouse "left" button events
     * input.events.suppress("a", "left");
     */
    suppress(...actions: Array<`${MouseInput}` | `${MouseInput} ${MouseState}` | `${CaseInsensitiveKey<any>}` | `${CaseInsensitiveKey<any>} ${KeyState}`>) {
      if (actions.length === 0) {
        return;
      }
      const inputActions: InputAction[] = actions.map((action) => {
        const parts = action.split(" ");
        const input = parts[0] as Input;
        if (["move", "left", "middle", "right", "wheel"].includes(input)) {
          const mouseType = "mouse";
          const mouseInput = input as MouseInput;
          const mouseState = parts[1] as MouseState | undefined;
          return { type: mouseType, input: mouseInput, state: mouseState };
        }
        const keyboardType = "keyboard";
        const keyboardInput = KeyMapper.toKeyCode(KeyFormatter.format(parts[0]));
        const keyboardState = parts[1] as KeyState | undefined;
        return { type: keyboardType, input: keyboardInput, state: keyboardState };
      });
      const mouseMappedInputsStates: Array<[number, Array<number>]> = [];
      const keyboardMappedInputsStates: Array<[number, Array<number>]> = [];
      for (const inputAction of inputActions) {
        if (inputAction.type === "mouse") {
          let mappedInput = -1;
          switch (inputAction.input) {
            case "move": mappedInput = 0; break;
            case "left": mappedInput = 1; break;
            case "right": mappedInput = 2; break;
            case "middle": mappedInput = 3; break;
            case "wheel": mappedInput = 4; break;
            default: break;
          }
          const mappedStates = [];
          switch (inputAction.state) {
            case "down": mappedStates.push(0); break;
            case "up": mappedStates.push(1); break;
            case "neutral": mappedStates.push(2); break;
            default: mappedStates.push(0, 1, 2); break;
          }
          mouseMappedInputsStates.push([mappedInput, mappedStates]);
        }
        else {
          const mappedInput = inputAction.input;
          const mappedStates = [];
          switch (inputAction.state) {
            case "down": mappedStates.push(0); break;
            case "up": mappedStates.push(1); break;
            default: mappedStates.push(0, 1); break;
          }
          keyboardMappedInputsStates.push([mappedInput, mappedStates]);
        }
      }
      if (mouseMappedInputsStates.length > 0) {
        suppressInputEvents(0, mouseMappedInputsStates);
      }
      if (keyboardMappedInputsStates.length > 0) {
        suppressInputEvents(1, keyboardMappedInputsStates);
      }
    },
    /**
     * @description Re-enable the given suppressed inputs.
     *
     * @param actions Input actions to unsuppress.
     *
     * ---
     * @example
     * // Unsuppress all keyboard "A" key and mouse "left" button events
     * input.events.unsuppress("a", "left");
     */
    unsuppress(...actions: Array<`${MouseInput}` | `${MouseInput} ${MouseState}` | `${CaseInsensitiveKey<any>}` | `${CaseInsensitiveKey<any>} ${KeyState}`>) {
      if (actions.length === 0) {
        return;
      }
      const inputActions: InputAction[] = actions.map((action) => {
        const parts = action.split(" ");
        const input = parts[0] as Input;
        if (["move", "left", "middle", "right", "wheel"].includes(input)) {
          const mouseType = "mouse";
          const mouseInput = input as MouseInput;
          const mouseState = parts[1] as MouseState | undefined;
          return { type: mouseType, input: mouseInput, state: mouseState };
        }
        const keyboardType = "keyboard";
        const keyboardInput = KeyMapper.toKeyCode(KeyFormatter.format(parts[0]));
        const keyboardState = parts[1] as KeyState | undefined;
        return { type: keyboardType, input: keyboardInput, state: keyboardState };
      });
      const mouseMappedInputsStates: Array<[number, Array<number>]> = [];
      const keyboardMappedInputsStates: Array<[number, Array<number>]> = [];
      for (const inputAction of inputActions) {
        if (inputAction.type === "mouse") {
          let mappedInput = -1;
          switch (inputAction.input) {
            case "move": mappedInput = 0; break;
            case "left": mappedInput = 1; break;
            case "right": mappedInput = 2; break;
            case "middle": mappedInput = 3; break;
            case "wheel": mappedInput = 4; break;
            default: break;
          }
          const mappedStates = [];
          switch (inputAction.state) {
            case "down": mappedStates.push(0); break;
            case "up": mappedStates.push(1); break;
            case "neutral": mappedStates.push(2); break;
            default: mappedStates.push(0, 1, 2); break;
          }
          mouseMappedInputsStates.push([mappedInput, mappedStates]);
        }
        else {
          const mappedInput = inputAction.input;
          const mappedStates = [];
          switch (inputAction.state) {
            case "down": mappedStates.push(0); break;
            case "up": mappedStates.push(1); break;
            default: mappedStates.push(0, 1); break;
          }
          keyboardMappedInputsStates.push([mappedInput, mappedStates]);
        }
      }
      if (mouseMappedInputsStates.length > 0) {
        unsuppressInputEvents(0, mouseMappedInputsStates);
      }
      if (keyboardMappedInputsStates.length > 0) {
        unsuppressInputEvents(1, keyboardMappedInputsStates);
      }
    },
  },
  /**
   * @description Input events recorder and replayer.
   */
  track: {
    /**
     * @description Record the given input actions and save them to a file.
     *
     * @param actions Input actions to record. If unset, all keyboard and mouse events will be recorded.
     * @returns The input record file controller.
     *
     * ---
     * @example
     * // Record all keyboard and mouse events
     * const inputRecordController = input.track
     *   .record()
     *   .into("/path/to/input-record.act")
     *   .start();
     *
     * // Record all keyboard "A" key events and mouse left button events
     * const inputRecordController = input.track
     *   .record("a", "left")
     *   .into("/path/to/input-record.act")
     *   .start();
     */
    record(...actions: Array<`${MouseInput}` | `${MouseInput} ${MouseState}` | `${CaseInsensitiveKey<any>}` | `${CaseInsensitiveKey<any>} ${KeyState}`>) {
      return {
        /**
         * @description Create the input record file and return its start controller.
         *
         * @param filepath The file path to save the input actions to.
         * @returns The input record start controller.
         *
         * ---
         * @example
         * // Record all keyboard and mouse events
         * const inputRecordController = input.track
         *   .record()
         *   .into("/path/to/input-record.act")
         *   .start();
         *
         * // Record all keyboard "A" key events and mouse left button events
         * const inputRecordController = input.track
         *   .record("a", "left")
         *   .into("/path/to/input-record.act")
         *   .start();
         */
        into(filepath: string) {
          return {
            /**
             * @description Start recording the given input actions into the given file.
             *
             * @returns The input record controller.
             *
             * ---
             * @example
             * // Record all keyboard and mouse events
             * const inputRecordController = input.track
             *   .record()
             *   .into("/path/to/input-record.act")
             *   .start();
             *
             * // Record all keyboard "A" key events and mouse left button events
             * const inputRecordController = input.track
             *   .record("a", "left")
             *   .into("/path/to/input-record.act")
             *   .start();
             */
            start() {
              const inputActions: InputAction[] = actions.map((action) => {
                const parts = action.split(" ");
                const input = parts[0] as Input;
                if (["move", "left", "middle", "right", "wheel"].includes(input)) {
                  const mouseType = "mouse";
                  const mouseInput = input as MouseInput;
                  const mouseState = parts[1] as MouseState | undefined;
                  return { type: mouseType, input: mouseInput, state: mouseState };
                }
                const keyboardType = "keyboard";
                const keyboardInput = KeyMapper.toKeyCode(KeyFormatter.format(parts[0]));
                const keyboardState = parts[1] as KeyState | undefined;
                return { type: keyboardType, input: keyboardInput, state: keyboardState };
              });
              const writeStream = filesystem.writeStream(filepath);
              const inputRecorder: InputRecorderScope = {
                when: inputActions,
                writeStream: writeStream,
                isPaused: false,
              };
              inputRecorders.push(inputRecorder);
              if (shouldStartMainListener()) {
                startEventListener(mainListener);
              }
              return {
                /**
                 * @description Pause the input recorder.
                 *
                 * @returns The input record controller.
                 *
                 * ---
                 * @example
                 * // Record all keyboard and mouse events
                 * const inputRecordController = input.track
                 *   .record()
                 *   .into("/path/to/input-record.act")
                 *   .start();
                 * // Pause the input recorder
                 * inputRecordController.pause();
                 *
                 * // Record all keyboard "A" key events and mouse left button events
                 * const inputRecordController = input.track
                 *   .record("a", "left")
                 *   .into("/path/to/input-record.act")
                 *   .start();
                 * // Pause the input recorder
                 * inputRecordController.pause();
                 */
                pause() {
                  inputRecorder.isPaused = true;
                  return this;
                },
                /**
                 * @description Resume the paused input recorder.
                 *
                 * @returns The input record controller.
                 *
                 * ---
                 * @example
                 * // Record all keyboard and mouse events
                 * const inputRecordController = input.track
                 *   .record()
                 *   .into("/path/to/input-record.act")
                 *   .start();
                 * // Pause the input recorder
                 * inputRecordController.pause();
                 * // Resume the input recorder
                 * inputRecordController.resume();
                 *
                 * // Record all keyboard "A" key events and mouse left button events
                 * const inputRecordController = input.track
                 *   .record("a", "left")
                 *   .into("/path/to/input-record.act")
                 *   .start();
                 * // Pause the input recorder
                 * inputRecordController.pause();
                 * // Resume the input recorder
                 * inputRecordController.resume();
                 */
                resume() {
                  inputRecorder.isPaused = false;
                  return this;
                },
                /**
                 * @description Stop the input recorder.
                 *
                 * ---
                 * @example
                 * // Record all keyboard and mouse events
                 * const inputRecordController = input.track
                 *   .record()
                 *   .into("/path/to/input-record.act")
                 *   .start();
                 * // Stop the input recorder
                 * inputRecordController.stop();
                 *
                 * // Record all keyboard "A" key events and mouse left button events
                 * const inputRecordController = input.track
                 *   .record("a", "left")
                 *   .into("/path/to/input-record.act")
                 *   .start();
                 * // Stop the input recorder
                 * inputRecordController.stop();
                 */
                stop() {
                  inputRecorder.writeStream.end();
                  const inputRecorderIndex = inputRecorders.indexOf(inputRecorder);
                  if (inputRecorderIndex !== -1) {
                    inputRecorders.splice(inputRecorderIndex, 1);
                  }
                  if (shouldStopMainListener()) {
                    stopEventListener();
                  }
                }
              };
            },
          };
        },
      };
    },
    /**
     * @description Replay all input events from a previous `track.record` file.
     *
     * @param filepath The file path of a previous `track.record` file.
     * @returns A promise that resolves when all the input events have been replayed.
     *
     * ---
     * @example
     * // Replay all keyboard and mouse events
     * await input.track.replay("/path/to/input-record.act");
     *
     * // Replay all keyboard and mouse events twice faster
     * await input.track.replay("/path/to/input-record.act", { speed: 2 });
     *
     * // Replay all keyboard and mouse events twice slower
     * await input.track.replay("/path/to/input-record.act", { speed: 0.5 });
     */
    async replay(filepath: string, options?: { speed?: number}) {
      if (!filesystem.exists(filepath)) {
        throw new Error(`File does not exist: ${filepath}`);
      }
      const readStream = filesystem.readStream(filepath);
      let previousIncompleteLine = "";
      let previousTimestamp = Infinity;
      let accumulatedDelay = 0;
      const speed = Math.max(1e-32, options?.speed ?? 1);
      const promises: Promise<void>[] = [];
      readStream.on("data", (chunk) => {
        const lines = `${previousIncompleteLine}${chunk.toString()}`.split("\n");
        previousIncompleteLine = "";
        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
          const line = lines[lineIndex];
          const lineColumns = line.split(",");
          const lineType = parseInt(lineColumns[0]);
          const isLastLine = (lineIndex === (lines.length - 1));
          const isValidLine = [0, 1].includes(lineType) && (lineColumns.length === (lineType === 0 ? 6 : 4));
          if (isValidLine) {
            const type = lineType === 0 ? "mouse" : "keyboard";
            const timestamp = parseInt(lineColumns[1]);
            const delay = previousTimestamp < timestamp ? (Math.round(timestamp / speed) - Math.round(previousTimestamp / speed)) : 0;
            previousTimestamp = timestamp;
            const promise = time.waitAsync(delay + accumulatedDelay, () => {
              if (type === "mouse") {
                const rawInput = parseInt(lineColumns[2]);
                switch (rawInput) {
                  case 0: {
                    const input: MouseInput = "move";
                    const x = parseInt(lineColumns[4]);
                    const y = parseInt(lineColumns[5]);
                    mouse.move(x, y);
                    break;
                  }
                  case 1: {
                    const input: MouseInput = "left";
                    const state: MouseState = parseInt(lineColumns[3]) === 0 ? "down" : "up";
                    const x = parseInt(lineColumns[4]);
                    const y = parseInt(lineColumns[5]);
                    if (mouse.x !== x || mouse.y !== y) {
                      mouse.move(x, y);
                    }
                    if (state === "down") {
                      mouse.left.down();
                    }
                    else {
                      mouse.left.up();
                    }
                    break;
                  }
                  case 2: {
                    const input: MouseInput = "right";
                    const state: MouseState = parseInt(lineColumns[3]) === 0 ? "down" : "up";
                    const x = parseInt(lineColumns[4]);
                    const y = parseInt(lineColumns[5]);
                    if (mouse.x !== x || mouse.y !== y) {
                      mouse.move(x, y);
                    }
                    if (state === "down") {
                      mouse.right.down();
                    }
                    else {
                      mouse.right.up();
                    }
                    break;
                  }
                  case 3: {
                    const input: MouseInput = "middle";
                    const state: MouseState = parseInt(lineColumns[3]) === 0 ? "down" : "up";
                    const x = parseInt(lineColumns[4]);
                    const y = parseInt(lineColumns[5]);
                    if (mouse.x !== x || mouse.y !== y) {
                      mouse.move(x, y);
                    }
                    if (state === "down") {
                      mouse.middle.down();
                    }
                    else {
                      mouse.middle.up();
                    }
                    break;
                  }
                  case 4: {
                    const input: MouseInput = "wheel";
                    const rawState = parseInt(lineColumns[3]);
                    const state: MouseState = rawState === 0 ? "down" : (rawState === 1 ? "up" : "neutral");
                    const x = parseInt(lineColumns[4]);
                    const y = parseInt(lineColumns[5]);
                    if (mouse.x !== x || mouse.y !== y) {
                      mouse.move(x, y);
                    }
                    switch (state) {
                      case "down":
                        mouse.scroll.down();
                        break;
                      case "up":
                        mouse.scroll.up();
                        break;
                      default:
                        break;
                    }
                    break;
                  }
                  default:
                    break;
                }
              }
              else {
                const input = parseInt(lineColumns[2]);
                const state = parseInt(lineColumns[3]) === 0 ? "down" : "up";
                if (state === "down") {
                  keyboard.down(input);
                }
                else {
                  keyboard.up(input);
                }
              }
            });
            promises.push(promise);
            accumulatedDelay += delay;
          }
          else if (isLastLine) {
            previousIncompleteLine = line;
          }
        }
      });
      return new Promise<void>((resolve, reject) => {
        readStream.on("end", async () => {
          await Promise.all(promises);
          resolve();
        });
      });
    }
  }
};

/**
 * @description Exit the process with the specified exit code.
 *
 * @param exitCode The exit code to exit with.
 *
 * ---
 * @example
 * // Exit the process with success code 0
 * exit();
 *
 * // Exit the process with error code 1
 * exit(1);
 */
export function exit(exitCode: number = 0) {
  process.exit(exitCode);
}
/**
 * @description Restart the process in a new detached process.
 *
 * ---
 * @example
 * // Restart the process
 * restart();
 */
export function restart() {
  const child = spawn(process.argv[0], process.argv.slice(1), { stdio: "inherit", detached: true });
  child.unref();
  process.exit(0);
}

/**
 * @description Execute the given function a specified number of times.
 *
 * @param callback The callback function to execute.
 * @param iterations The number of times to execute the callback. If unset, the callback will be executed indefinitely.
 * @returns A promise that resolves when the callback has been executed the specified number of times.
 *
 * ---
 * @example
 * // Execute the callback 10 times
 * await loop((index) => console.log(`Hello ${index + 1} times!`), 10);
 *
 * // Execute the callback indefinitely
 * await loop(() => console.log("Hello world!"));
 */
export const loop = async (callback: (index: number) => Promise<void> | void, iterations: number = Infinity) => {
  const iterationsCount = Math.max(0, Math.floor(iterations));
  if (iterationsCount === 0) {
    return;
  }
  return new Promise<void>((resolve, reject) => {
    let iteration = 0;
    const next = async (iteration: number) => {
      if (iteration < iterationsCount) {
        try {
          const result = callback(iteration);
          if (result instanceof Promise) {
            await result;
          }
          iteration++;
          // setImmediate is much faster but can impact system performance
          setTimeout(next.bind(null, iteration), 0);
        }
        catch (error) {
          reject(error);
        }
      }
      else {
        resolve();
      }
    };
    next(iteration);
  });
};

export default {
  input,
  mouse,
  keyboard,
  screen,
  window,
  clipboard,
  time,
  ai,
  filesystem,
  exit,
  restart,
  loop
};
