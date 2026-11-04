export type RestartOptions = {

  /**
   * @description File paths the restarted process' standard streams are
   * redirected to. Any stream left unspecified is ignored.
   */
  stdio?: {

    /**
     * @description Path to an existing file to read the standard input from.
     */
    in?: string;

    /**
     * @description Path to a file to append the standard output to (created, with its parent directories, if missing).
     */
    out?: string;

    /**
     * @description Path to a file to append the standard error to (created, with its parent directories, if missing).
     */
    err?: string;

  };

};
