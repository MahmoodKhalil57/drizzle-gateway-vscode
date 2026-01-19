import * as vscode from "vscode";

export class GatewayTreeProvider implements vscode.TreeDataProvider<GatewayItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<
    GatewayItem | undefined | null | void
  > = new vscode.EventEmitter<GatewayItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<
    GatewayItem | undefined | null | void
  > = this._onDidChangeTreeData.event;

  private isRunning: boolean = false;

  constructor() {}

  refresh(isRunning: boolean): void {
    this.isRunning = isRunning;
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: GatewayItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: GatewayItem): Thenable<GatewayItem[]> {
    if (element) {
      return Promise.resolve([]);
    }

    const items: GatewayItem[] = [];

    if (!this.isRunning) {
      items.push(
        new GatewayItem(
          "Start Gateway",
          "drizzleGateway.start",
          "play",
          "Start the Drizzle Gateway server",
        ),
      );

      // NEW: Add Update button only when stopped
      items.push(
        new GatewayItem(
          "Update Binary",
          "drizzleGateway.updateBinary",
          "cloud-download",
          "Redownload the latest binary",
        ),
      );
    } else {
      items.push(
        new GatewayItem(
          "Stop Gateway",
          "drizzleGateway.stop",
          "stop",
          "Stop the Drizzle Gateway server",
        ),
      );
      items.push(
        new GatewayItem(
          "Open Studio",
          "drizzleGateway.open",
          "browser",
          "Open Drizzle Studio in tab",
        ),
      );
    }

    return Promise.resolve(items);
  }
}

class GatewayItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly commandId: string,
    iconName: string,
    tooltip: string,
  ) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.tooltip = tooltip;
    this.iconPath = new vscode.ThemeIcon(iconName);

    // Connect click action to the command
    this.command = {
      command: commandId,
      title: label,
    };
  }
}
