const { OpenAIClient, AzureKeyCredential } = require("@azure/openai");
import * as core from "@actions/core";

async function main() {
  const key = core.getInput("azure-openai-api-key");
  const endpoint = core.getInput("azure-openai-endpoint");
  const client = new OpenAIClient(endpoint, new AzureKeyCredential(key));

  core.debug(`azure-openai-prompt: ${core.getInput("azure-openai-prompt")}`);

  const { choices } = await client.getCompletions(
    core.getInput("model"),
    core.getInput("openai-prompt"),
    {
      maxTokens: 256,
    },
  );
  const completion = choices[0].text;
  // The output of this action is the text from OpenAI trimmed and escaped
  core.setOutput(
    "text",
    completion.trim().replace(/(\r\n|\n|\r|'|"|`|)/gm, ""),
  );
}

main().catch((err) => {
  if (err instanceof Error) {
    core.setFailed(err.message);
  }
});
