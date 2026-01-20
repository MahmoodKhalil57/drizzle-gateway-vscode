import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import * as https from "https";

export class GatewayDownloader {
  // Fetch latest version using Docker Registry V2 API (works for public GHCR packages)
  static async getLatestVersion(): Promise<string> {
    // Step 1: Get anonymous token for public package
    const tokenResponse = await fetch(
      "https://ghcr.io/token?scope=repository:drizzle-team/gateway:pull",
    );
    const tokenData = (await tokenResponse.json()) as { token?: string };
    const token = tokenData.token;

    // Step 2: List tags using the token
    const tagsResponse = await fetch(
      "https://ghcr.io/v2/drizzle-team/gateway/tags/list",
      {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      },
    );
    const data = (await tagsResponse.json()) as { tags?: string[] };
    console.log("🚀 ~ GatewayDownloader ~ getLatestVersion ~ data:", data);

    // Sort tags to get the latest semver version
    const tags = data.tags || [];
    const sortedTags = tags
      .filter((tag) => /^\d+\.\d+\.\d+/.test(tag)) // Filter semver tags
      .sort((a, b) =>
        b.localeCompare(a, undefined, { numeric: true, sensitivity: "base" }),
      );
    return sortedTags[0] || "latest";
  }
  static getLocalBinaryPath(context: vscode.ExtensionContext): string {
    const fileName =
      process.platform === "win32" ? "drizzle-gateway.exe" : "drizzle-gateway";
    return path.join(context.globalStorageUri.fsPath, fileName);
  }

  // ... (getDownloadUrl and downloadFile methods remain the same) ...

  private static async getDownloadUrl(): Promise<string> {
    const platform = process.platform;
    const arch = process.arch;

    let platformName: string;
    if (platform === "linux") {
      platformName = "linux";
    } else if (platform === "darwin") {
      platformName = "macos";
    } else if (platform === "win32") {
      throw new Error(
        "Windows is not currently supported. Please use Linux or macOS.",
      );
    } else {
      throw new Error(`Unsupported platform: ${platform}`);
    }

    let archName: string;
    if (arch === "x64") {
      archName = "x64";
    } else if (arch === "arm64") {
      archName = "arm64";
    } else {
      throw new Error(`Unsupported architecture: ${arch}`);
    }

    const version = await this.getLatestVersion();
    console.log("🚀 ~ GatewayDownloader ~ getDownloadUrl ~ version:", version);
    return `https://pub-e240a4fd7085425baf4a7951e7611520.r2.dev/drizzle-gateway-${version}-${platformName}-${archName}`;
  }

  // Force download regardless of whether file exists
  static async redownload(context: vscode.ExtensionContext): Promise<void> {
    const localPath = this.getLocalBinaryPath(context);

    // 1. Delete existing binary if it exists
    if (fs.existsSync(localPath)) {
      try {
        fs.unlinkSync(localPath);
      } catch (error) {
        vscode.window.showErrorMessage(
          `Cannot delete existing binary. Is it currently running?`,
        );
        return;
      }
    }

    // 2. Start Download
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Updating Drizzle Gateway...",
        cancellable: false,
      },
      async (progress) => {
        try {
          const url = await this.getDownloadUrl();
          await this.downloadFile(url, localPath);

          if (process.platform !== "win32") {
            fs.chmodSync(localPath, "755");
          }

          vscode.window.showInformationMessage(
            "Drizzle Gateway updated successfully!",
          );
        } catch (err: any) {
          vscode.window.showErrorMessage(`Update failed: ${err.message}`);
        }
      },
    );
  }

  // Existing ensureBinary method (simplified for context)
  static async ensureBinary(
    context: vscode.ExtensionContext,
  ): Promise<string | undefined> {
    const localPath = this.getLocalBinaryPath(context);
    if (fs.existsSync(localPath)) {
      return localPath;
    }

    // ... (rest of ensureBinary logic: create dir, ask user, download) ...
    // Note: You can reuse the logic by calling this.redownload internally if you refactor slightly,
    // but for now, keeping the existing flow is fine.

    // Make sure directory exists
    if (!fs.existsSync(context.globalStorageUri.fsPath)) {
      fs.mkdirSync(context.globalStorageUri.fsPath, { recursive: true });
    }

    const url = await this.getDownloadUrl();
    await this.downloadFile(url, localPath);
    if (process.platform !== "win32") {
      fs.chmodSync(localPath, "755");
    }
    return localPath;
  }

  private static downloadFile(url: string, dest: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(dest);
      https
        .get(url, (response) => {
          if (response.statusCode !== 200 || !response) {
            reject(
              new Error(`Failed to download (Status ${response.statusCode})`),
            );
            return;
          }
          response.pipe(file);
          file.on("finish", () => {
            file.close();
            resolve();
          });
        })
        .on("error", (err) => {
          fs.unlink(dest, () => {});
          reject(err);
        });
    });
  }
}
