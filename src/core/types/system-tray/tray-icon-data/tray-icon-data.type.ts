export type TrayIconData = {
  trayIconWindowId: number;
  absoluteIconPath: string;
  tooltip: string;
  onTrayMenuRestartClick: () => void;
  onTrayMenuExitClick: () => void;
};
