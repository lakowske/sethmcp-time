#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const server = new Server(
  {
    name: 'mcp-time-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'get_current_time',
        description: 'Get the current date and time',
        inputSchema: {
          type: 'object',
          properties: {
            timezone: {
              type: 'string',
              description: 'Timezone (e.g., "UTC", "America/New_York"). Defaults to system timezone.',
            },
            format: {
              type: 'string',
              description: 'Time format (e.g., "iso", "unix", "locale"). Defaults to "iso".',
              enum: ['iso', 'unix', 'locale'],
            },
          },
        },
      },
      {
        name: 'get_timezone_offset',
        description: 'Get the timezone offset for a specific timezone',
        inputSchema: {
          type: 'object',
          properties: {
            timezone: {
              type: 'string',
              description: 'Timezone to get offset for (e.g., "America/New_York")',
            },
          },
          required: ['timezone'],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'get_current_time') {
    const format = args?.format || 'iso';
    const timezone = args?.timezone;
    
    let date = new Date();
    let result;

    switch (format) {
      case 'unix':
        result = Math.floor(date.getTime() / 1000).toString();
        break;
      case 'locale':
        result = timezone 
          ? date.toLocaleString('en-US', { timeZone: timezone })
          : date.toLocaleString();
        break;
      case 'iso':
      default:
        if (timezone) {
          result = date.toLocaleString('sv-SE', { 
            timeZone: timezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
          }).replace(' ', 'T') + 'Z';
        } else {
          result = date.toISOString();
        }
        break;
    }

    return {
      content: [
        {
          type: 'text',
          text: `Current time: ${result}`,
        },
      ],
    };
  }

  if (name === 'get_timezone_offset') {
    const timezone = args?.timezone;
    if (!timezone) {
      return {
        content: [
          {
            type: 'text',
            text: 'Error: Timezone parameter is required',
          },
        ],
        isError: true,
      };
    }

    try {
      const now = new Date();
      const tzString = now.toLocaleString('en-US', { 
        timeZone: timezone,
        hour12: false,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });

      const [datePart, timePart] = tzString.split(', ');
      const [month, day, year] = datePart.split('/');
      const [hour, minute] = timePart.split(':');
      
      const utcHour = now.getUTCHours();
      const tzHour = parseInt(hour);
      
      let offset = tzHour - utcHour;
      if (offset > 12) offset -= 24;
      if (offset < -12) offset += 24;

      return {
        content: [
          {
            type: 'text',
            text: `Timezone ${timezone} offset: ${offset >= 0 ? '+' : ''}${offset} hours from UTC`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: Invalid timezone: ${timezone}`,
          },
        ],
        isError: true,
      };
    }
  }

  return {
    content: [
      {
        type: 'text',
        text: `Error: Unknown tool: ${name}`,
      },
    ],
    isError: true,
  };
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('MCP Time Server started');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});