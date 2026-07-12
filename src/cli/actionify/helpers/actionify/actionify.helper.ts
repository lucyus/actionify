import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import type { GithubAssetFile } from "../../types";
import { version as pkgVersion } from "../../../../../package.json";

export class ActionifyHelper {

  public static async fetchDownloadableNativeModules(commandFullName: string): Promise<GithubAssetFile[]> {
    const actionifyVersion = pkgVersion;
    const httpRequestOptions = process.env.GITHUB_ACCESS_TOKEN
      ? { headers: { "Authorization": `Bearer ${process.env.GITHUB_ACCESS_TOKEN}` } }
      : undefined
    ;
    const httpResponse = await fetch(`https://api.github.com/repos/lucyus/actionify/releases/tags/v${actionifyVersion}`, httpRequestOptions);
    if (httpResponse.status !== 200) {
      if ([403, 429].includes(httpResponse.status)) {
        const isGithubRateLimitExceed = httpResponse.headers.get("x-ratelimit-remaining") === "0";
        if (isGithubRateLimitExceed) {
          const xRateLimitResetHeader = httpResponse.headers.get("x-ratelimit-reset");
          const isUsingWindows = process.platform === "win32";
          if (xRateLimitResetHeader) {
            const rateLimitResetUnixTimestamp = parseInt(xRateLimitResetHeader);
            if (!isNaN(rateLimitResetUnixTimestamp)) {
              const minutesToWait = Math.ceil((rateLimitResetUnixTimestamp - Date.now() / 1000) / 60);
              throw new Error([
                `\x1b[31mError: Github API rate limit exceeded. Retry in ${minutesToWait} minute${minutesToWait > 1 ? "s" : ""}.\x1b[0m`,
                ``,
                `To avoid waiting:`,
                `  1. Create a Github Access Token: https://github.com/settings/personal-access-tokens/new`,
                (
                  !isUsingWindows
                  ? [`  2. Run this command in your terminal: \x1b[96mGITHUB_ACCESS_TOKEN=YOUR_ACCESS_TOKEN ${commandFullName}\x1b[0m`].join("\n")
                  : [
                    `  2. Run this command in:`,
                    `    • PowerShell: \x1b[96m$env:GITHUB_ACCESS_TOKEN="YOUR_ACCESS_TOKEN"; ${commandFullName}\x1b[0m`,
                    `    • Command Prompt: \x1b[96mset GITHUB_ACCESS_TOKEN=YOUR_ACCESS_TOKEN && ${commandFullName}\x1b[0m`,
                    `    • Bash: \x1b[96mGITHUB_ACCESS_TOKEN=YOUR_ACCESS_TOKEN ${commandFullName}\x1b[0m`,
                  ].join("\n")
                ),
              ].join("\n"));
            }
          }
          throw new Error([
            `\x1b[31mError: Github API rate limit exceeded. Retry later.\x1b[0m`,
            ``,
            `To avoid waiting:`,
            `  1. Create a Github Access Token: https://github.com/settings/personal-access-tokens/new`,
            (
              !isUsingWindows
              ? [`  2. Run this command in your terminal: \x1b[96mGITHUB_ACCESS_TOKEN=YOUR_ACCESS_TOKEN ${commandFullName}\x1b[0m`].join("\n")
              : [
                `  2. Run this command in:`,
                `    • PowerShell: \x1b[96m$env:GITHUB_ACCESS_TOKEN="YOUR_ACCESS_TOKEN"; ${commandFullName}\x1b[0m`,
                `    • Command Prompt: \x1b[96mset GITHUB_ACCESS_TOKEN=YOUR_ACCESS_TOKEN && ${commandFullName}\x1b[0m`,
                `    • Bash: \x1b[96mGITHUB_ACCESS_TOKEN=YOUR_ACCESS_TOKEN ${commandFullName}\x1b[0m`,
              ].join("\n")
            ),
          ].join("\n"));
        }
      }
      if (httpResponse.status === 401) {
        throw new Error(`Error: Invalid Github Access Token: "${process.env.GITHUB_ACCESS_TOKEN}". Verify it and try again.`);
      }
      throw new Error(`Error: Github API returned HTTP status code ${httpResponse.status}. Expected HTTP status code 200.`);
    }
    const actionifyNativeModulesReleaseContent: ({ assets: GithubAssetFile[] }) = await httpResponse.json();
    if (!actionifyNativeModulesReleaseContent?.assets) {
      return [];
    }
    const actionifyNativeModules = actionifyNativeModulesReleaseContent.assets.filter(
      (asset) => asset.name.endsWith(".node")
        && asset.browser_download_url !== null
    );
    actionifyNativeModules.sort((a, b) => a.name.localeCompare(b.name));
    return actionifyNativeModules;
  }

  public static async downloadNativeModuleFile(githubAssetFile: GithubAssetFile, pathToDownloadTo: string): Promise<string> {
    if (!githubAssetFile.browser_download_url) {
      throw new Error(`Error: Could not download TTS model "${githubAssetFile.name}" (missing download_url).`);
    }
    const fileContent = await (await fetch(githubAssetFile.browser_download_url)).arrayBuffer();
    const downloadLocation = path.join(pathToDownloadTo, "actionify.node");
    fs.writeFileSync(downloadLocation, Buffer.from(fileContent));
    return downloadLocation;
  }

}
