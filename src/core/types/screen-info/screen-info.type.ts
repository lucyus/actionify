/**
 * @description Monitor (screen) information
 */
export type ScreenInfo = {

  /**
   * @description The monitor numeric identifier. The main monitor has `id` equal to 0,
   * while the secondary monitor has `id` equal to 1, and so on.
   */
  id: number;

  /**
   * @description The monitor top-left corner position (in pixels).
   */
  origin: {

    /**
     * @description The monitor top-left corner horizontal position (in pixels).
     */
    x: number;

    /**
     * @description The monitor top-left corner vertical position (in pixels).
     */
    y: number;
  };

  /**
   * @description The monitor dimensions (in pixels).
   */
  dimensions: {

    /**
     * @description The monitor width (in pixels).
     */
    width: number;

    /**
     * @description The monitor height (in pixels).
     */
    height: number;
  };

  /**
   * @description The monitor DPI scale factor.
   */
  scale: {

    /**
     * @description The monitor horizontal DPI scale factor. It is equal to the
     * `scale.y` vertical DPI scale factor.
     */
    x: number;

    /**
     * @description The monitor vertical DPI scale factor. It is equal to the
     * `scale.x` horizontal DPI scale factor.
     */
    y: number;

  };

};
