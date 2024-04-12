import * as core from "@actions/core";
import { computeDiff, showColorDiff } from './diff';
import { AzureOpenAIExec } from './azure-openai';

const main = async (): Promise<void> => {
  core.startGroup('diff');
  await showColorDiff(core.getInput("base"), core.getInput("head"));
  core.endGroup();

  const diffs = await computeDiff(core.getInput("base"), core.getInput("head"));
  if (diffs.length === 0) {
    core.info("No diff");
    core.setOutput("text", "No diff");
  }

  const text = await AzureOpenAIExec("Write a description for this git diff: \n ${diffs.map(diff => diff.content).join('\n')}");
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
