export type MatchRegion = {
  /**
   * @description Top-left point of the matched region.
   */
  position: {
    /**
     * @description Horizontal position in pixels.
     */
    x: number;
    /**
     * @description Vertical position in pixels.
     */
    y: number;
  };
  /**
   * @description Width and height of the matched region.
   */
  dimensions: {
    /**
     * @description Width in pixels.
     */
    width: number;
    /**
     * @description Height in pixels.
     */
    height: number;
  };
  /**
   * @description The `similarity` between the template and this matched region.
   * - A `similarity` closer to 1 means a better match.
   * - A `similarity` closer to 0 means a worse match.
   */
  similarity: number;
};
