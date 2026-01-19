# Drizzle Gateway VSCode

Run [Drizzle Gateway](https://github.com/drizzle-team/drizzle-gateway) directly from VS Code.

## Features

- Start and stop Drizzle Gateway from within VS Code
- Auto-download Drizzle Gateway binary on first use
- Manage gateway settings through VS Code configuration
- Activity bar integration with dedicated controls panel

## Requirements

- VS Code 1.108.1 or higher
- A database to connect to (PostgreSQL, MySQL, SQLite, etc.)

## Extension Settings

This extension contributes the following settings:

- `drizzleGateway.binaryPath`: Absolute path to the Drizzle Gateway binary executable. Leave empty to auto-download.
- `drizzleGateway.databaseUrl`: The connection string for your database (DATABASE_URL).
- `drizzleGateway.port`: Port to run the Drizzle Gateway on (default: 4983).
- `drizzleGateway.password`: Master password for the Gateway (MASTERPASS).

## Usage

1. Install the extension
2. Configure your database URL in settings: `drizzleGateway.databaseUrl`
3. Use the Drizzle Gateway panel in the activity bar or run commands:
   - `Drizzle Gateway: Start` - Start the gateway server
   - `Drizzle Gateway: Stop` - Stop the gateway server

## Release Notes

### 0.0.1

Initial release of Drizzle Gateway VSCode extension.

## License

MIT
