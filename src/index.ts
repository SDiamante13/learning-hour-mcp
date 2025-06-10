#!/usr/bin/env node

import 'dotenv/config';
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import axios from "axios";
import { MiroIntegration } from "./MiroIntegration.js";
import { LearningHourGenerator } from "./LearningHourGenerator.js";

const GenerateSessionInputSchema = z.object({
  topic: z.string().min(1, "Topic is required"),
});

const GenerateCodeExampleInputSchema = z.object({
  topic: z.string().min(1, "Topic is required"),
  language: z.string().optional().default("javascript"),
});

const CreateMiroBoardInputSchema = z.object({
  sessionContent: z.any(),
  accessToken: z.string().min(1, "Miro access token is required"),
});

const GetMiroAuthUrlInputSchema = z.object({
  redirectUri: z.string().min(1, "Redirect URI is required"),
  state: z.string().optional(),
});

class LearningHourMCP {
  private server: Server;
  private generator: LearningHourGenerator;

  constructor() {
    this.generator = new LearningHourGenerator();
    this.server = new Server(
      {
        name: "learning-hour-mcp",
        version: "2.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "generate_session",
          description: "Generate comprehensive Learning Hour content for Technical Coaches",
          inputSchema: {
            type: "object",
            properties: {
              topic: {
                type: "string",
                description: "The learning topic (e.g., 'Feature Envy', 'DRY Principle')",
              },
            },
            required: ["topic"],
          },
        },
        {
          name: "generate_code_example",
          description: "Generate detailed before/after code examples for a learning topic",
          inputSchema: {
            type: "object",
            properties: {
              topic: {
                type: "string",
                description: "The learning topic (e.g., 'Feature Envy', 'DRY Principle')",
              },
              language: {
                type: "string",
                description: "Programming language for examples (default: javascript)",
                default: "javascript"
              },
            },
            required: ["topic"],
          },
        },
        {
          name: "create_miro_board",
          description: "Create a Miro board from Learning Hour session content",
          inputSchema: {
            type: "object",
            properties: {
              sessionContent: {
                type: "object",
                description: "Session content from generate_session output",
              },
              accessToken: {
                type: "string",
                description: "Miro access token for API authentication",
              },
            },
            required: ["sessionContent", "accessToken"],
          },
        },
        {
          name: "get_miro_auth_url",
          description: "Generate Miro OAuth authorization URL",
          inputSchema: {
            type: "object",
            properties: {
              redirectUri: {
                type: "string",
                description: "OAuth redirect URI for your application",
              },
              state: {
                type: "string",
                description: "Optional state parameter for OAuth security",
              },
            },
            required: ["redirectUri"],
          },
        },
        {
          name: "test_miro_token",
          description: "Test if a Miro access token is valid",
          inputSchema: {
            type: "object",
            properties: {
              accessToken: {
                type: "string",
                description: "Miro access token to test",
              },
            },
            required: ["accessToken"],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        switch (request.params.name) {
          case "generate_session":
            return await this.generateSession(request.params.arguments);
          case "generate_code_example":
            return await this.generateCodeExample(request.params.arguments);
          case "create_miro_board":
            return await this.createMiroBoard(request.params.arguments);
          case "get_miro_auth_url":
            return await this.getMiroAuthUrl(request.params.arguments);
          case "test_miro_token":
            return await this.testMiroToken(request.params.arguments);
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${request.params.name}`
            );
        }
      } catch (error) {
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  }

  private async generateSession(args: any) {
    const input = GenerateSessionInputSchema.parse(args);
    
    try {
      const sessionData = await this.generator.generateSessionContent(input.topic);

      return {
        content: [
          {
            type: "text",
            text: `✅ Learning Hour session generated for: ${input.topic}`,
          },
          {
            type: "text", 
            text: JSON.stringify(sessionData, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to generate session: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async generateCodeExample(args: any) {
    const input = GenerateCodeExampleInputSchema.parse(args);
    
    try {
      const exampleData = await this.generator.generateCodeExample(input.topic, input.language);

      return {
        content: [
          {
            type: "text",
            text: `✅ Code examples generated for: ${input.topic} (${input.language})`,
          },
          {
            type: "text",
            text: JSON.stringify(exampleData, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to generate code example: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async createMiroBoard(args: any) {
    const input = CreateMiroBoardInputSchema.parse(args);
    
    try {
      const miro = new MiroIntegration(input.accessToken);
      
      const isValidToken = await miro.validateToken();
      if (!isValidToken) {
        throw new Error('Invalid Miro access token');
      }

      const layout = await miro.createLearningHourBoard(input.sessionContent);
      const viewLink = await miro.getBoardViewLink(layout.boardId);

      return {
        content: [
          {
            type: "text",
            text: `✅ Miro board created successfully!`,
          },
          {
            type: "text",
            text: `Board ID: ${layout.boardId}`,
          },
          {
            type: "text",
            text: `View Link: ${viewLink}`,
          },
          {
            type: "text",
            text: JSON.stringify(layout, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to create Miro board: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async getMiroAuthUrl(args: any) {
    const input = GetMiroAuthUrlInputSchema.parse(args);
    
    if (!process.env.MIRO_CLIENT_ID) {
      throw new Error('MIRO_CLIENT_ID environment variable is required');
    }

    try {
      const authUrl = MiroIntegration.getAuthorizationUrl(
        process.env.MIRO_CLIENT_ID,
        input.redirectUri,
        input.state
      );

      return {
        content: [
          {
            type: "text",
            text: `✅ Miro OAuth authorization URL generated`,
          },
          {
            type: "text",
            text: `Visit this URL to authorize: ${authUrl}`,
          },
          {
            type: "text",
            text: `After authorization, you'll receive a code at your redirect URI that can be exchanged for an access token.`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to generate Miro auth URL: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async testMiroToken(args: any) {
    const { accessToken } = args;
    
    try {
      const miro = new MiroIntegration(accessToken);
      const isValid = await miro.validateToken();
      
      if (isValid) {
        return {
          content: [
            {
              type: "text",
              text: `✅ Miro access token is valid and working`,
            },
          ],
        };
      } else {
        return {
          content: [
            {
              type: "text",
              text: `❌ Miro access token is invalid or expired`,
            },
          ],
        };
      }
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Error testing Miro token: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Learning Hour MCP server running on stdio");
  }
}

const server = new LearningHourMCP();
server.run().catch(console.error);