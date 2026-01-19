import * as vscode from "vscode";
import * as cp from "child_process";
import * as fs from "fs";
import * as net from "net";
import { GatewayTreeProvider } from "./GatewayTreeProvider";
import { GatewayDownloader } from "./Downloader"; // Import the downloader

let gatewayProcess: cp.ChildProcess | null = null;
let outputChannel: vscode.OutputChannel;
let treeProvider: GatewayTreeProvider;

export function activate(context: vscode.ExtensionContext) {
  outputChannel = vscode.window.createOutputChannel("Drizzle Gateway");
  treeProvider = new GatewayTreeProvider();
  vscode.window.registerTreeDataProvider("drizzleGatewayView", treeProvider);

  let startDisposable = vscode.commands.registerCommand(
    "drizzleGateway.start",
    async () => {
      if (gatewayProcess) {
        vscode.window.showInformationMessage(
          "Drizzle Gateway is already running.",
        );
        return;
      }

      const config = vscode.workspace.getConfiguration("drizzleGateway");
      let binaryPath = config.get<string>("binaryPath");

      // --- NEW LOGIC: Check Config -> Then Check Downloader ---
      if (!binaryPath || !fs.existsSync(binaryPath)) {
        // If no manual config, check our internal storage or download it
        binaryPath = await GatewayDownloader.ensureBinary(context);

        if (!binaryPath) {
          // User cancelled or download failed
          return;
        }
      }
      // ---------------------------------------------------------

      const databaseUrl = config.get<string>("databaseUrl");
      const port = config.get<number>("port") || 4983;
      const password = config.get<string>("password");

      outputChannel.show();
      outputChannel.appendLine(`Starting Drizzle Gateway from: ${binaryPath}`);

      const env = {
        ...process.env,
        DATABASE_URL: databaseUrl,
        PORT: port.toString(),
        MASTERPASS: password || undefined,
        HOST: "127.0.0.1",
      };

      try {
        gatewayProcess = cp.spawn(binaryPath, [], { env });
        treeProvider.refresh(true);

        gatewayProcess.stdout?.on("data", (data) =>
          outputChannel.append(data.toString()),
        );
        gatewayProcess.stderr?.on("data", (data) =>
          outputChannel.append(`[Log]: ${data.toString()}`),
        );

        gatewayProcess.on("close", (code) => {
          outputChannel.appendLine(`Drizzle Gateway exited with code ${code}`);
          gatewayProcess = null;
          treeProvider.refresh(false);
          vscode.window.showInformationMessage("Drizzle Gateway stopped.");
        });

        vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: "Starting Drizzle Gateway...",
            cancellable: false,
          },
          async () => {
            try {
              await waitForPort(port);
              vscode.window.showInformationMessage(
                `Drizzle Gateway running on port ${port}`,
              );
              vscode.commands.executeCommand("drizzleGateway.open");
            } catch (e) {
              vscode.window.showErrorMessage("Timed out waiting for Gateway.");
              gatewayProcess?.kill();
            }
          },
        );
      } catch (err: any) {
        vscode.window.showErrorMessage(
          `Failed to start gateway: ${err.message}`,
        );
      }
    },
  );

  // ... (stopDisposable and openDisposable remain the same) ...

  // Re-include command registration here for copy-paste completeness
  let stopDisposable = vscode.commands.registerCommand(
    "drizzleGateway.stop",
    () => {
      if (gatewayProcess) {
        gatewayProcess.kill();
      }
    },
  );
  let openDisposable = vscode.commands.registerCommand(
    "drizzleGateway.open",
    () => {
      const p =
        vscode.workspace.getConfiguration("drizzleGateway").get("port") || 4983;
      vscode.commands.executeCommand(
        "simpleBrowser.show",
        `http://127.0.0.1:${p}`,
      );
    },
  );

  let updateDisposable = vscode.commands.registerCommand(
    "drizzleGateway.updateBinary",
    async () => {
      if (gatewayProcess) {
        vscode.window.showWarningMessage("Please stop the Gateway before updating.");
        return;
      }

      const choice = await vscode.window.showWarningMessage(
          "This will delete the current binary and download the latest version. Continue?",
          "Yes", "No"
      );

      if (choice === "Yes") {
          await GatewayDownloader.redownload(context);
      }
    }
  );

  context.subscriptions.push(startDisposable, stopDisposable, openDisposable, updateDisposable);
}

// ... (deactivate and waitForPort remain the same) ...

export function deactivate() {
  if (gatewayProcess) {
    gatewayProcess.kill();
  }
}

function waitForPort(port: number, timeout = 10000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const interval = setInterval(() => {
      if (Date.now() - start > timeout) {
        clearInterval(interval);
        reject(new Error("Timeout"));
        return;
      }
      const socket = new net.Socket();
      socket.connect(port, "127.0.0.1", () => {
        socket.destroy();
        clearInterval(interval);
        resolve();
      });
      socket.on("error", () => socket.destroy());
    }, 200);
  });
}
