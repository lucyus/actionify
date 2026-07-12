import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import type { GithubAssetFile } from "../../types";

export class SherpaOnnxHelper {

  public static async fetchDownloadableTtsModels(commandFullName: string): Promise<GithubAssetFile[]> {
    const httpRequestOptions = process.env.GITHUB_ACCESS_TOKEN
      ? { headers: { "Authorization": `Bearer ${process.env.GITHUB_ACCESS_TOKEN}` } }
      : undefined
    ;
    const httpResponse = await fetch(`https://api.github.com/repos/k2-fsa/sherpa-onnx/releases/tags/tts-models`, httpRequestOptions);
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
    const ttsModelsRepositoryContent: ({ assets: GithubAssetFile[] }) = await httpResponse.json();
    if (!ttsModelsRepositoryContent?.assets) {
      return [];
    }
    const ttsModels = ttsModelsRepositoryContent.assets.filter(
      (asset) => /kokoro|kitten|vits/i.test(asset.name)
        && asset.browser_download_url !== null
    );
    ttsModels.sort((a, b) => a.name.localeCompare(b.name));
    return ttsModels;
  }

  public static inferLanguage(ttsModelName: string): string | undefined {
    const modelNameParts = ttsModelName.replace(".tar.bz2", "").toLowerCase().split("-");
    for (const modelNamePart of modelNameParts) {
      if (SherpaOnnxHelper.#languagesMap.has(modelNamePart)) {
        return SherpaOnnxHelper.#languagesMap.get(modelNamePart);
      }
    }
  }

  public static localModelSizeInBytes(modelDirectoryPath: string): number {
    let totalModelSizeInBytes = 0;

    const files = fs.readdirSync(modelDirectoryPath);

    for (const file of files) {
      const filePath = path.join(modelDirectoryPath, file);
      const fileStats = fs.statSync(filePath);

      if (fileStats.isFile()) {
        totalModelSizeInBytes += fileStats.size;
      }
      else if (fileStats.isDirectory()) {
        totalModelSizeInBytes += this.localModelSizeInBytes(filePath);
      }
    }

    return totalModelSizeInBytes;
  }

  public static async downloadTtsModelFile(githubAssetFile: GithubAssetFile, pathToDownloadTo: string): Promise<string> {
    if (!githubAssetFile.browser_download_url) {
      throw new Error(`Error: Could not download TTS model "${githubAssetFile.name}" (missing download_url).`);
    }
    const fileContent = await (await fetch(githubAssetFile.browser_download_url)).arrayBuffer();
    const downloadLocation = path.join(pathToDownloadTo, githubAssetFile.name);
    fs.writeFileSync(downloadLocation, Buffer.from(fileContent));
    const childProcess = spawn("tar", ["-xjvf", downloadLocation.replace(/\\/g, "/"), "-C", pathToDownloadTo.replace(/\\/g, "/"), "--force-local"], { shell: true });
    let commandStdOuput = "";
    childProcess.stdout.on("data", (data) => commandStdOuput += data.toString());
    childProcess.stderr.on("data", (data) => commandStdOuput += data.toString());
    await new Promise<void>((resolve, reject) => {
      childProcess.on("error", reject);
      childProcess.on("close", (code) => {
        if (code !== 0) {
          reject(new Error(`Error: Failed to extract TTS model "${downloadLocation}" into "${pathToDownloadTo}". Reason:\n${commandStdOuput}`));
        }
        else {
          resolve();
        }
      });
    });
    fs.unlinkSync(downloadLocation);
    const ttsModelPath = path.join(pathToDownloadTo, githubAssetFile.name.replace(".tar.bz2", ""));
    return ttsModelPath;
  }

  static #languagesMap: Map<string, string> = new Map<string, string>([
    ["af_za", "Afrikaans (South Africa)"],
    ["ar_jo", "Arabic (Jordan)"],
    ["bg", "Bulgarian"],
    ["bn", "Bengali"],
    ["ca_es", "Catalan (Spain)"],
    ["cantonese", "Chinese (Cantonese)"],
    ["cs", "Czech"],
    ["cs_cz", "Czech (Czech Republic)"],
    ["cy_gb", "Welsh (UK)"],
    ["da", "Danish"],
    ["da_dk", "Danish (Denmark)"],
    ["de", "German"],
    ["de_de", "German (Germany)"],
    ["deu", "German"],
    ["el", "Greek"],
    ["el_gr", "Greek (Greece)"],
    ["en", "English"],
    ["en_gb", "English (UK)"],
    ["en_us", "English (US)"],
    ["eng", "English"],
    ["es", "Spanish"],
    ["es_ar", "Spanish (Argentina)"],
    ["es_es", "Spanish (Spain)"],
    ["es_mx", "Spanish (Mexico)"],
    ["et", "Estonian"],
    ["eu_es", "Basque (Spain)"],
    ["fa", "Persian (Farsi)"],
    ["fa_en", "Persian-English (Mixed)"],
    ["fa_ir", "Persian (Iran)"],
    ["fi", "Finnish"],
    ["fi_fi", "Finnish (Finland)"],
    ["fr", "French"],
    ["fr_fr", "French (France)"],
    ["fra", "French"],
    ["ga", "Irish"],
    ["gu", "Gujarati"],
    ["gu_in", "Gujarati (India)"],
    ["hi_in", "Hindi (India)"],
    ["hr", "Croatian"],
    ["hu", "Hungarian"],
    ["hu_hu", "Hungarian (Hungary)"],
    ["id", "Indonesian"],
    ["id_id", "Indonesian (Indonesia)"],
    ["is", "Icelandic"],
    ["is_is", "Icelandic (Iceland)"],
    ["it", "Italian"],
    ["it_it", "Italian (Italy)"],
    ["ka_ge", "Georgian (Georgia)"],
    ["kk_kz", "Kazakh (Kazakhstan)"],
    ["ko_ko", "Korean"],
    ["ku_tr", "Kurdish (Turkey)"],
    ["lb_lu", "Luxembourgish (Luxembourg)"],
    ["lt", "Lithuanian"],
    ["lv", "Latvian"],
    ["lv_lv", "Latvian (Latvia)"],
    ["ml_in", "Malayalam (India)"],
    ["mt", "Maltese"],
    ["multi", "Multilingual"],
    ["nan", "Chinese (Taiwan)"],
    ["ne", "Nepali"],
    ["ne_np", "Nepali (Nepal)"],
    ["nl", "Dutch"],
    ["nl_be", "Dutch (Belgium)"],
    ["nl_nl", "Dutch (Netherlands)"],
    ["no_no", "Norwegian"],
    ["pl", "Polish"],
    ["pl_pl", "Polish (Poland)"],
    ["pt", "Portuguese"],
    ["pt_br", "Portuguese (Brazil)"],
    ["pt_pt", "Portuguese (Portugal)"],
    ["ro", "Romanian"],
    ["ro_ro", "Romanian (Romania)"],
    ["ru", "Russian"],
    ["ru_ru", "Russian (Russia)"],
    ["rus", "Russian"],
    ["sk", "Slovak"],
    ["sk_sk", "Slovak (Slovakia)"],
    ["sl", "Slovenian"],
    ["sl_si", "Slovenian (Slovenia)"],
    ["spa", "Spanish"],
    ["sq_al", "Albanian (Albania)"],
    ["sr_rs", "Serbian (Serbia)"],
    ["sv", "Swedish"],
    ["sv_se", "Swedish (Sweden)"],
    ["sw_cd", "Swahili (DR Congo)"],
    ["th", "Thai"],
    ["tha", "Thai"],
    ["tn_za", "Tswana (South Africa)"],
    ["tr_tr", "Turkish (Turkey)"],
    ["uk", "Ukrainian"],
    ["uk_ua", "Ukrainian (Ukraine)"],
    ["ukr", "Ukrainian"],
    ["ur_pk", "Urdu (Pakistan)"],
    ["vi", "Vietnamese"],
    ["vi_vn", "Vietnamese (Vietnam)"],
    ["xh_za", "Xhosa (South Africa)"],
    ["zh", "Chinese (Mandarin)"],
    ["zh_cn", "Chinese (Mandarin, China)"],
    ["zh_en", "Chinese-English (Mixed)"],
  ]);

}
