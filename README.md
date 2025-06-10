# Learning Hour MCP

An MCP server that generates comprehensive Learning Hour content for Technical Coaches, enabling teams to practice technical excellence through structured deliberate practice sessions. Works seamlessly with the Miro MCP for creating interactive boards.

## Philosophy

Learning Hours are structured practice sessions where software teams develop technical excellence skills through deliberate practice. Just as athletes and pilots dedicate time to practice their craft, software developers need dedicated time to master fundamental programming practices that stand the test of time.

This MCP server supports the **4C Learning Model** (Connect → Concept → Concrete → Conclusion) and focuses on technical practices that enhance agility:
- Test Driven Development (TDD)
- Refactoring techniques
- Clean code principles
- Evolutionary design
- Pairing/ensemble programming

## Features

- **Generate Session Content**: Creates comprehensive Learning Hour materials for any coding topic
- **Generate Code Examples**: Produces before/after code examples with explanations
- **Miro Integration**: Direct integration with Miro API to create visual Learning Hour boards
- **OAuth Support**: Complete OAuth flow for Miro authentication

## Tools

### `generate_session`
Generates comprehensive Learning Hour content including objectives, activities, and discussion prompts.

**Input:**
```json
{
  "topic": "Feature Envy"
}
```

**Output:** Structured session data with `miroContent` section ready for Miro board creation.

### `generate_code_example`
Creates detailed before/after code examples for learning topics.

**Input:**
```json
{
  "topic": "Feature Envy",
  "language": "javascript"
}
```

### `get_miro_auth_url`
Generates a Miro OAuth authorization URL for obtaining access tokens.

**Input:**
```json
{
  "redirectUri": "http://localhost:3000/callback",
  "state": "optional-security-state"
}
```

### `test_miro_token`
Tests if a Miro access token is valid and working.

**Input:**
```json
{
  "accessToken": "your_miro_access_token"
}
```

### `create_miro_board`
Creates a Miro board with Learning Hour content automatically laid out.

**Input:**
```json
{
  "sessionContent": {}, // Output from generate_session
  "accessToken": "your_miro_access_token"
}
```

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env
# Edit .env and add your Anthropic API key
```

3. Get your API keys:

   **Anthropic API Key:**
   - Visit [Anthropic Console](https://console.anthropic.com/)
   - Create an account or sign in
   - Generate an API key
   - Add it to your `.env` file:
     ```
     ANTHROPIC_API_KEY=your_actual_api_key_here
     ```

   **Miro Integration (Optional):**
   - Visit [Miro Developers](https://developers.miro.com/)
   - Create a new app to get Client ID and Client Secret
   - Add to your `.env` file:
     ```
     MIRO_CLIENT_ID=your_miro_client_id
     MIRO_CLIENT_SECRET=your_miro_client_secret
     ```

4. Build and run:
```bash
npm run build && npm start
```

## Testing

Run the integration tests to verify your API connection:

```bash
# Run all tests
npm test

# Run only integration tests
npm run test:integration
```

**Note**: Integration tests require a valid `ANTHROPIC_API_KEY` in your `.env` file and will make real API calls.

## Miro Integration Workflow

### Getting a Miro Access Token

To use Miro integration, you need a valid access token. Here are two ways:

#### Option A: Quick Personal Access Token (Easiest)
1. Go to [Miro Developer Portal](https://developers.miro.com/reference/oauth-2.0)
2. Create a developer account
3. Create a new app
4. Generate a personal access token
5. Test it: `test_miro_token {"accessToken": "your_token"}`

#### Option B: OAuth Flow (For Production)
1. **Get Authorization URL**:
```json
{
  "tool": "get_miro_auth_url",
  "arguments": {
    "redirectUri": "http://localhost:3000/callback"
  }
}
```

2. Visit the URL, authorize, and exchange the code for a token

### Using Miro Integration

1. **Test Your Token**:
```json
{
  "tool": "test_miro_token",
  "arguments": {
    "accessToken": "your_miro_access_token"
  }
}
```

2. **Generate Learning Session**:
```json
{
  "tool": "generate_session",
  "arguments": {
    "topic": "Feature Envy"
  }
}
```

3. **Create Miro Board**:
```json
{
  "tool": "create_miro_board",
  "arguments": {
    "sessionContent": {}, // Use output from step 2
    "accessToken": "your_miro_access_token"
  }
}
```

### Option 2: Manual Miro Integration

You can also use the structured `miroContent` output from `generate_session` with other Miro tools or the Miro web interface.

## Environment Variables

- `ANTHROPIC_API_KEY`: Required - your Anthropic API key for generating Learning Hour content
- `MIRO_CLIENT_ID`: Optional - your Miro app client ID for OAuth authentication
- `MIRO_CLIENT_SECRET`: Optional - your Miro app client secret for OAuth authentication

## Usage Examples

**Generate a complete Learning Hour:**
```json
{
  "tool": "generate_session",
  "arguments": {
    "topic": "Single Responsibility Principle"
  }
}
```

**Create code examples:**
```json
{
  "tool": "generate_code_example", 
  "arguments": {
    "topic": "Feature Envy",
    "language": "python"
  }
}
```

The output includes structured content perfect for Technical Coaches to run effective Learning Hours with hands-on exercises and group discussions.

## Documentation

- [Learning Hours Guide](./docs/LEARNING_HOURS.md) - Comprehensive guide to Learning Hours philosophy and implementation
- [Domain Vocabulary](./docs/DOMAIN_VOCABULARY.md) - Key terms and concepts used in Learning Hours
- [Coding Style Guidelines](./docs/CODING_STYLE.md) - Code style aligned with clean code principles

## Learning Outcomes

Teams practicing Learning Hours experience:
- Frequent deployments with minimal defects
- Faster development velocity  
- Higher quality software delivery
- Improved team morale and collaboration
- Reduced technical debt

> "Continuous attention to technical excellence and good design enhances agility" - The 9th principle of the Agile Manifesto