import fs from "node:fs";
import path from "node:path";
import { GithubFile } from "../../types";

export class TesseractHelper {

  public static async fetchDownloadableTrainedData(commandFullName: string, type: "fast" | "best" = "best"): Promise<GithubFile[]> {
    const httpRequestOptions = process.env.GITHUB_ACCESS_TOKEN
      ? { headers: { "Authorization": `Bearer ${process.env.GITHUB_ACCESS_TOKEN}` } }
      : undefined
    ;
    const httpResponse = await fetch(`https://api.github.com/repos/tesseract-ocr/tessdata_${type}/contents`, httpRequestOptions);
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
    const fastTrainedDataRepositoryContent: GithubFile[] = await httpResponse.json();
    const fastTrainedDataFiles = fastTrainedDataRepositoryContent.filter(
      (file: GithubFile) => file.type === "file"
        && file.name.endsWith(".traineddata")
        && file.download_url !== null
    );
    fastTrainedDataFiles.sort((a: GithubFile, b: GithubFile) => a.name.localeCompare(b.name));
    return fastTrainedDataFiles;
  }

  public static async fetchLanguagesMap(): Promise<Map<string, string>> {
    const tesseractLanguagesDoc = await (await fetch("https://raw.githubusercontent.com/tesseract-ocr/tessdoc/main/Data-Files-in-different-versions.md")).text();
    const rawLanguagesMatches = tesseractLanguagesDoc.split("### Languages")[1].split("### Scripts")[0].matchAll(/^\|\s*(\w+)\s*\|\s*([^|]+?)\s*\|/gm);
    const languagesMap: Map<string, string> = new Map<string, string>();
    for (const rawLanguageMatch of rawLanguagesMatches) {
      languagesMap.set(rawLanguageMatch[1], rawLanguageMatch[2]);
    }
    return languagesMap;
  }

  public static async downloadTrainedDataFile(githubFile: GithubFile, pathToDownloadTo: string): Promise<string> {
    if (!githubFile.download_url) {
      throw new Error(`Error: Could not download traineddata file for ${githubFile.name} (missing download_url).`);
    }
    const fileContent = await (await fetch(githubFile.download_url)).arrayBuffer();
    const downloadLocation = path.join(pathToDownloadTo, githubFile.name);
    fs.writeFileSync(downloadLocation, Buffer.from(fileContent));
    return downloadLocation;
  }

}
