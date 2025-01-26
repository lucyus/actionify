export type InputEvent = {
  type: "mouse" | "keyboard";
  state: "down" | "up" | "neutral";
  timestamp: number;
};
