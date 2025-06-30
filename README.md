# MCP Time Server

A simple Model Context Protocol (MCP) server that provides time-related tools via stdio transport.

## Features

This MCP server provides two tools:

1. **get_current_time** - Get the current date and time

   - Supports multiple formats: ISO, Unix timestamp, locale string
   - Optional timezone parameter

2. **get_timezone_offset** - Get the timezone offset for a specific timezone

## Installation

```bash
npm install
```

## Usage

### Running the server directly

```bash
npm start
```

### Testing the server

```bash
# Use the working client (recommended)
node working-client.js

```

### Integrating with Claude Desktop

Add this configuration to your Claude Desktop config:

```json
{
  "mcpServers": {
    "time-server": {
      "command": "node",
      "args": ["/path/to/mcp-time-server/src/index.js"]
    }
  }
}
```

## Example Tool Calls

### get_current_time

```json
{
  "name": "get_current_time",
  "arguments": {
    "format": "iso",
    "timezone": "America/New_York"
  }
}
```

### get_timezone_offset

```json
{
  "name": "get_timezone_offset",
  "arguments": {
    "timezone": "Asia/Tokyo"
  }
}
```

## Known Issues

- The MCP SDK client (`example-client.js`) may experience timeout issues with Node.js 18.x due to compatibility issues. Use `working-client.js` for testing instead, which implements the MCP protocol directly.
- For production use with Node.js 18.x, consider using Node.js 20+ or implementing your own client as shown in `working-client.js`.

## Development

The server uses the MCP SDK and communicates via stdio. All server logs are written to stderr to avoid interfering with the stdio protocol.
