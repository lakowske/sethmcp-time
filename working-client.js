#!/usr/bin/env node
import { spawn } from 'child_process';
import { once } from 'events';

class SimpleClient {
  constructor() {
    this.messageId = 1;
    this.pendingRequests = new Map();
  }

  async connect(command, args) {
    this.process = spawn(command, args, {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    this.process.stdout.on('data', (data) => {
      const messages = data.toString().trim().split('\n');
      for (const message of messages) {
        if (message) {
          try {
            const response = JSON.parse(message);
            if (response.id && this.pendingRequests.has(response.id)) {
              const { resolve } = this.pendingRequests.get(response.id);
              this.pendingRequests.delete(response.id);
              resolve(response);
            }
          } catch (e) {
            console.error('Failed to parse response:', e);
          }
        }
      }
    });

    this.process.stderr.on('data', (data) => {
      console.error('Server log:', data.toString().trim());
    });

    // Initialize
    const initResponse = await this.request('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'working-client', version: '1.0.0' }
    });

    console.log('Connected to MCP server');
    return initResponse;
  }

  async request(method, params = {}) {
    const id = this.messageId++;
    const message = {
      jsonrpc: '2.0',
      id,
      method,
      params
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      this.process.stdin.write(JSON.stringify(message) + '\n');

      // Set timeout
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('Request timed out'));
        }
      }, 5000);
    });
  }

  async callTool(name, args = {}) {
    const response = await this.request('tools/call', {
      name,
      arguments: args
    });
    return response.result;
  }

  async listTools() {
    const response = await this.request('tools/list');
    return response.result;
  }

  close() {
    this.process.kill();
  }
}

async function main() {
  const client = new SimpleClient();
  
  try {
    await client.connect('node', ['src/index.js']);

    // List tools
    const tools = await client.listTools();
    console.log('\nAvailable tools:');
    tools.tools.forEach(tool => {
      console.log(`  • ${tool.name}: ${tool.description}`);
    });

    // Test get_current_time
    console.log('\n--- Testing get_current_time ---');
    
    const isoTime = await client.callTool('get_current_time', {});
    console.log('Default (ISO):', isoTime.content[0].text);

    const unixTime = await client.callTool('get_current_time', { format: 'unix' });
    console.log('Unix timestamp:', unixTime.content[0].text);

    const nyTime = await client.callTool('get_current_time', { 
      format: 'locale', 
      timezone: 'America/New_York' 
    });
    console.log('NY locale:', nyTime.content[0].text);

    // Test get_timezone_offset
    console.log('\n--- Testing get_timezone_offset ---');
    
    const nyOffset = await client.callTool('get_timezone_offset', { 
      timezone: 'America/New_York' 
    });
    console.log(nyOffset.content[0].text);

    const londonOffset = await client.callTool('get_timezone_offset', { 
      timezone: 'Europe/London' 
    });
    console.log(londonOffset.content[0].text);

    const tokyoOffset = await client.callTool('get_timezone_offset', { 
      timezone: 'Asia/Tokyo' 
    });
    console.log(tokyoOffset.content[0].text);

    console.log('\n✓ All tests passed!');
    client.close();
  } catch (error) {
    console.error('Error:', error);
    client.close();
    process.exit(1);
  }
}

main();