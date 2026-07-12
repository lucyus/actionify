import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { name as pkgName } from "../../../../../package.json";

export class RepositoryHelper {

  public static get isActionifyRepository(): boolean {
    const findProject = createRequire(`${process.cwd()}/package.json`);
    const projectName = findProject(`${process.cwd()}/package.json`).name;
    return projectName === pkgName;
  }

  public static async resolveProjectDirectory(): Promise<string> {
    const findProject = createRequire(`${process.cwd()}/package.json`);
    const projectName = findProject(`${process.cwd()}/package.json`).name;
    if (projectName === pkgName) {
      // Contributor inside @lucyus/actionify repository
      const projectAbsoluteFolderPath = path.dirname(findProject.resolve(`${process.cwd()}/package.json`));
      return projectAbsoluteFolderPath;
    }
    // NPM user having @lucyus/actionify as a dependency
    const actionifyAbsoluteInstallFolderPath = path.dirname(findProject.resolve(`${pkgName}/package.json`));
    return actionifyAbsoluteInstallFolderPath;
  }

  public static async resolveDataDirectory(subFolders: string[] = [], shouldCreateIfMissing: boolean = true): Promise<string> {
    const projectDirectory = await RepositoryHelper.resolveProjectDirectory();
    const assetsDirectory = path.join(
      projectDirectory,
      "data",
      ...subFolders
    );
    if (shouldCreateIfMissing) {
      fs.mkdirSync(assetsDirectory, { recursive: true });
    }
    return assetsDirectory;
  }

  public static async resolveNativeModuleDirectory(subFolders: string[] = [], shouldCreateIfMissing: boolean = true): Promise<string> {
    const projectDirectory = await RepositoryHelper.resolveProjectDirectory();
    const assetsDirectory = path.join(
      projectDirectory,
      "build",
      "Release",
      ...subFolders
    );
    if (shouldCreateIfMissing) {
      fs.mkdirSync(assetsDirectory, { recursive: true });
    }
    return assetsDirectory;
  }

}
