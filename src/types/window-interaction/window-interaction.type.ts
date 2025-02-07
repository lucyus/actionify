export type WindowInteraction = {
  /**
   * @description Minimize the window.
   *
   * @returns Whether the window is minimized.
   *
   * ---
   * @example
   * // Get running windows
   * const windows = window.list();
   * // Minimize the first window
   * windows[0].minimize();
   */
  minimize(): boolean;
  /**
   * @description Maximize the window to fit the screen it is on.
   *
   * @returns Whether the window is maximized.
   *
   * ---
   * @example
   * // Get running windows
   * const windows = window.list();
   * // Maximize the first window
   * windows[0].maximize();
   */
  maximize(): boolean;
  /**
   * @description Restore the window.
   * This is the opposite of `minimize`.
   *
   * @returns Whether the window is restored.
   *
   * ---
   * @example
   * // Get running windows
   * const windows = window.list();
   * // Restore the first window
   * windows[0].restore();
   */
  restore(): boolean;
  /**
   * @description Close the window.
   * For some applications, this will also stop their process(es).
   *
   * @returns Whether the window is closed.
   *
   * ---
   * @example
   * // Get running windows
   * const windows = window.list();
   * // Close the first window
   * windows[0].close();
   */
  close(): boolean;
  /**
   * @description Put the window in the foreground and focus it.
   * If the window is initially minimized, it will be restored first.
   *
   * @returns Whether the window is focused.
   *
   * ---
   * @example
   * // Get running windows
   * const windows = window.list();
   * // Focus the first window
   * windows[0].focus();
   */
  focus(): boolean;
  /**
   * @description Move the window to a given position. If unset, the current window position will be used.
   * The position is relative to the main monitor (with origin in top-left corner at 0,0).
   *
   * @param x The new window X position.
   * @param y The new window Y position.
   * @returns Whether the window has moved.
   *
   * ---
   * @example
   * // Get running windows
   * const windows = window.list();
   *
   * // Instant movement of the first window
   * windows[0].move(100, 100);
   *
   * // Delayed movement (in milliseconds) of the first window
   * await windows[0].move(100, 100, { delay: 1000 });
   *
   * // Linear motion over time of the first window
   * await windows[0].move(100, 100, { motion: "linear", delay: 1000, steps: "auto" });
   *
   * // Arc motion over time of the first window
   * await windows[0].move(100, 100, { motion: "arc", delay: 1000, steps: "auto" });
   *
   * // Wave motion over time of the first window
   * await windows[0].move(100, 100, { motion: "wave", delay: 1000, steps: "auto", frequency: "auto" });
   */
  move: (x?: number, y?: number, options?: { steps?: number | "auto", delay?: number, motion?: "linear" | "arc" | "wave", curvinessFactor?: number, mirror?: boolean, frequency?: number | "auto" }) => Promise<void> | Promise<void[]>;
  /**
   * @description Resize the window dimensions to a given size.
   *
   * @param width The new window width, in pixels.
   * @param height The new window height, in pixels.
   * @returns Whether the window has resized.
   *
   * ---
   * @example
   * // Get running windows
   * const windows = window.list();
   *
   * // Instant resize of the first window
   * windows[0].resize(100, 100);
   *
   * // Delayed resize (in milliseconds) of the first window
   * await windows[0].resize(100, 100, { delay: 1000 });
   *
   * // Linear resize motion over time of the first window
   * await windows[0].resize(100, 100, { motion: "linear", delay: 1000, steps: "auto" });
   *
   * // Arc resize motion over time of the first window
   * await windows[0].resize(100, 100, { motion: "arc", delay: 1000, steps: "auto" });
   *
   * // Wave resize motion over time of the first window
   * await windows[0].resize(100, 100, { motion: "wave", delay: 1000, steps: "auto", frequency: "auto" });
   */
  resize: (width?: number, height?: number, options?: { steps?: number | "auto", delay?: number, motion?: "linear" | "arc" | "wave", curvinessFactor?: number, mirror?: boolean, frequency?: number | "auto" }) => Promise<void> | Promise<void[]>;
  /**
   * @description Move the window to the foreground.
   * If the window is initially minimized, it will be restored first.
   *
   * @returns Whether the window is in the foreground.
   *
   * ---
   * @example
   * // Get running windows
   * const windows = window.list();
   * // Move the first window to the foreground
   * windows[0].top();
   */
  top(): boolean;
  /**
   * @description Move the window to the background.
   * If the window is initially minimized, it will be restored first.
   *
   * @returns Whether the window is in the background.
   *
   * ---
   * @example
   * // Get running windows
   * const windows = window.list();
   * // Move the first window to the background
   * windows[0].bottom();
   */
  bottom(): boolean;
  /**
   * @description Set the window into the top (normal) or topmost (always on top) category.
   * If the window is initially minimized, it will be restored first.
   *
   * @param shouldBeAlwaysOnTop Whether the window should be always on top of other windows (topmost category).
   * @returns Whether the window has successfully been set into the top or topmost category.
   *
   * ---
   * @example
   * // Get running windows
   * const windows = window.list();
   * // Set the first window into the topmost (always on top) category
   * windows[0].alwaysOnTop();
   * // Set the first window into the top (default) category
   * windows[0].alwaysOnTop(false);
   */
  alwaysOnTop(shouldBeAlwaysOnTop?: boolean): boolean;
};
