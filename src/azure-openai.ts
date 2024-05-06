// const { OpenAIClient, AzureKeyCredential } = require("@azure/openai");
import { OpenAIClient, AzureKeyCredential } from "@azure/openai";
import * as core from "@actions/core";

export const AzureOpenAIExec = async (prompt: string): Promise<string> => {
  const key = core.getInput("azure-openai-api-key");
  const endpoint = core.getInput("azure-openai-endpoint");
  const client = new OpenAIClient(endpoint, new AzureKeyCredential(key));

  core.debug(`azure-openai-prompt: ${core.getInput("azure-openai-prompt")}`);

  const { choices } = await client.getCompletions(
    core.getInput("model"),
    [prompt],
    {
      maxTokens: 256,
      temperature: 0.5
    },
  );
  const completion = choices[0].text;
  return completion.trim();
};
