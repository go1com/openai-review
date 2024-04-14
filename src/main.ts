import * as core from "@actions/core";
import { context } from "@actions/github";
import { Octokit } from "@octokit/action";
// import { computeDiff, showColorDiff } from './diff';
import { AzureOpenAIExec } from './azure-openai';

const main = async (): Promise<void> => {

  if (context.eventName !== 'pull_request') {
    core.setFailed(
      `This action only supports pull requests, ${context.eventName} events are not supported. ` +
      "Please submit an issue on this action's GitHub repo if you believe this in correct."
    )
    return;
  }

  if (context.payload.pull_request?.number === undefined) {
    core.setFailed(
      `Can't get the pull request number` +
      "Please submit an issue on this action's GitHub repo if you believe this in correct."
    )
    return;
  }

  // Create GitHub client with the API token.
  const octokit = new Octokit();
  // Get the diff content of the PR.
  const response = await octokit.rest.pulls.get({
    ...context.repo,
    pull_number: context.payload.pull_request?.number,
    mediaType: {
      format: "diff",
    },
  });
  // Ensure that the request was successful.
  if (response.status !== 200) {
    core.setFailed(
      `The GitHub API for comparing the base and head commits for this ${context.eventName} event returned ${response.status}, expected 200. ` +
      "Please submit an issue on this action's GitHub repo."
    )
  }

  // Ensure that payload sent to OpenAI is not too big.
  // if (response.data.length > 2048) {
  //   core.setFailed(
  //     `The commit have too much changes. ` +
  //     "Please submit an issue on this action's GitHub repo."
  //   )
  // }

  const text = await AzureOpenAIExec(`Write a description for this git diff: \n ${response.data}`);
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
