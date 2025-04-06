export type WindowInfo = {
  id: number;
  pid: number;
  title: string;
  executableFile: string;
  className: string;
  position: {
    x: number;
    y: number;
  };
  dimensions: {
    width: number;
    height: number;
  };
  isMinimized: boolean;
  isMaximized: boolean;
  isRestored: boolean;
  isFocused: boolean;
  isAlwaysOnTop: boolean;
};
