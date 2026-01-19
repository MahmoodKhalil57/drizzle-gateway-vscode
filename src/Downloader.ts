import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import * as https from "https";
import * as os from "os";

// TODO: Replace this with the actual release URL pattern
const BASE_URL =
  "https://github.com/drizzle-team/drizzle-gateway/releases/latest/download";

export class GatewayDownloader {
  static getLocalBinaryPath(context: vscode.ExtensionContext): string {
    const fileName =
      process.platform === "win32" ? "drizzle-gateway.exe" : "drizzle-gateway";
    return path.join(context.globalStorageUri.fsPath, fileName);
  }

  // ... (getDownloadUrl and downloadFile methods remain the same) ...

  private static getDownloadUrl(): string {
    return `https://pub-e240a4fd7085425baf4a7951e7611520.r2.dev/drizzle-gateway-1.2.0-linux-x64`;
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
          const url = this.getDownloadUrl();
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
    if (fs.existsSync(localPath)) return localPath;

    // ... (rest of ensureBinary logic: create dir, ask user, download) ...
    // Note: You can reuse the logic by calling this.redownload internally if you refactor slightly,
    // but for now, keeping the existing flow is fine.

    // Make sure directory exists
    if (!fs.existsSync(context.globalStorageUri.fsPath)) {
      fs.mkdirSync(context.globalStorageUri.fsPath, { recursive: true });
    }

    const url = this.getDownloadUrl();
    await this.downloadFile(url, localPath);
    if (process.platform !== "win32") fs.chmodSync(localPath, "755");
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
