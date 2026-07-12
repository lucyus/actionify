import { platform } from 'os';

export class OperatingSystemService {

  public static get platform(): NodeJS.Platform {
    return platform();
  }

}
