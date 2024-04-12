import * as core from "@actions/core";
// import { computeDiff, showColorDiff } from './diff';
import { AzureOpenAIExec } from './azure-openai';

const main = async (): Promise<void> => {

  const diffs = core.getInput("diff");

  const text = await AzureOpenAIExec(`Write a description for this git diff: \n ${diffs}`);
  // The output of this action is the text from OpenAI trimmed and escaped
  core.setOutput(
    "text",
    text.replace(/(\r\n|\n|\r|'|"|`|)/gm, ""),
  );
}

main().catch((err) => {
  if (err instanceof Error) {
    core.setFailed(err.message);
  }
  console.error(err);
});
