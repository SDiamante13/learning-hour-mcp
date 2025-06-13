import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

export class GitHubMCPClient {
  private client?: Client;
  private isConnected: boolean = false;

  async connect(): Promise<void> {
    if (this.isConnected) return;

    try {
      this.client = new Client({
        name: "learning-hour-github-client",
        version: "1.0.0"
      }, {
        capabilities: {}
      });

      const transport = new StdioClientTransport({
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-github"],
        env: {
          ...process.env,
          GITHUB_PERSONAL_ACCESS_TOKEN: process.env.GITHUB_TOKEN || ""
        }
      });

      await this.client.connect(transport);
      this.isConnected = true;
    } catch (error) {
      throw error;
    }
  }

  async searchRepositoryFiles(owner: string, repo: string, query: string): Promise<any> {
    if (!this.client || !this.isConnected) {
      throw new Error("GitHub MCP client not connected");
    }

    return await this.client.callTool({
      name: "search_code",
      arguments: {
        q: `${query} repo:${owner}/${repo}`,
        per_page: 30
      }
    });
  }

  async getFileContent(owner: string, repo: string, path: string): Promise<any> {
    if (!this.client || !this.isConnected) {
      throw new Error("GitHub MCP client not connected");
    }

    return await this.client.callTool({
      name: "get_file_contents",
      arguments: {
        owner,
        repo,
        path
      }
    });
  }

  async getRepositoryStructure(owner: string, repo: string): Promise<any> {
    if (!this.client || !this.isConnected) {
      throw new Error("GitHub MCP client not connected");
    }

    return await this.client.callTool({
      name: "get_file_contents",
      arguments: {
        owner,
        repo,
        path: ""
      }
    });
  }

  async getRepositoryInfo(owner: string, repo: string): Promise<any> {
    if (!this.client || !this.isConnected) {
      throw new Error("GitHub MCP client not connected");
    }

    // The GitHub MCP server doesn't have a get_repo tool, so we'll search for the repo instead
    return await this.client.callTool({
      name: "search_repositories",
      arguments: {
        query: `repo:${owner}/${repo}`,
        perPage: 1
      }
    });
  }

  async disconnect(): Promise<void> {
    if (this.client && this.isConnected) {
      await this.client.close();
      this.isConnected = false;
    }
  }
}