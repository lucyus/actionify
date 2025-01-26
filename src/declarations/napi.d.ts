
declare module "@napi/actionify" {
  import type { Position } from "../types/position/position.type";
  import type { ScreenInfo } from "../types/screen-info/screen-info.type";
  import type { WindowInfo } from "../types/window-info/window-info.type";
  import type { Color } from "../types/color/color.type";
  const value: {
    getCursorPos: Position;
    setCursorPos: (x: number, y: number) => void;
    leftClickDown: () => void;
    leftClickUp: () => void;
    rightClickDown: () => void;
    rightClickUp: () => void;
    mouseWheelScrollDown: (scrollAmount?: number) => void;
    mouseWheelScrollUp: (scrollAmount?: number) => void;
    mouseWheelPressDown: () => void;
    mouseWheelPressUp: () => void;
    keyPressDown: (keyCode: number) => void;
    keyPressUp: (keyCode: number) => void;
    typeUnicodeCharacter: (character: string) => void;
    getAvailableScreens: () => ScreenInfo[];
    startEventListener: (callback: Function) => void;
    stopEventListener: () => void;
    cleanResources: () => void;
    listWindows: () => Array<WindowInfo>;
    focusWindow: (hwnd: number) => boolean;
    restoreWindow: (hwnd: number) => boolean;
    minimizeWindow: (hwnd: number) => boolean;
    maximizeWindow: (hwnd: number) => boolean;
    closeWindow: (hwnd: number) => boolean;
    setWindowPosition: (hwnd: number, x: number, y: number) => boolean;
    setWindowDimensions: (hwnd: number, width: number, height: number) => boolean;
    setWindowToBottom: (hwnd: number) => boolean;
    setWindowToTop: (hwnd: number) => boolean;
    setWindowToAlwaysOnTop: (hwnd: number, shouldBeAlwaysOnTop: boolean) => boolean;
    getPixelColor: (x: number, y: number) => Color;
    takeScreenshotToFile: (x: number, y: number, width: number, height: number, filePath: string) => string;
    copyTextToClipboard: (text: string) => boolean;
    copyFileToClipboard: (filePath: string) => boolean;
    sleep: (milliseconds: number) => void;
    suppressInputEvents: (type: number, inputStateMap: Array<[number, Array<number>]>) => void;
    unsuppressInputEvents: (type: number, inputStateMap: Array<[number, Array<number>]>) => void;
    performOcrOnImage: (imagePath: string, language?: string) => string;
  };
  export = value;
}
