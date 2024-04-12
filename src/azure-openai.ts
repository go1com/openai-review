const { OpenAIClient, AzureKeyCredential } = require("@azure/openai");
import * as core from "@actions/core";

export const AzureOpenAIExec = async (prompt: string): Promise<string> => {
  const key = core.getInput("azure-openai-api-key");
  const endpoint = core.getInput("azure-openai-endpoint");
  const client = new OpenAIClient(endpoint, new AzureKeyCredential(key));

  core.debug(`azure-openai-prompt: ${core.getInput("azure-openai-prompt")}`);

  const { choices } = await client.getCompletions(
    core.getInput("model"),
    // core.getInput("openai-prompt"),
    prompt,
    {
      maxTokens: 256,
    },
  );
  const completion = choices[0].text;
  return completion.trim();
};
