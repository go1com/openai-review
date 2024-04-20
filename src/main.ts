import * as core from '@actions/core';
import { context } from '@actions/github';
import { Octokit } from '@octokit/action';
import { AzureOpenAIExec } from './azure-openai';

const main = async (): Promise<void> => {
  const {
    eventName,
    payload: { pull_request },
  } = context;
  if (context.eventName !== 'pull_request') {
    core.setFailed(
      `This action only supports pull requests, ${eventName} events are not supported. ` +
        "Please submit an issue on this action's GitHub repo if you believe this in correct.",
    );
    return;
  }

  if (pull_request?.number === undefined) {
    core.setFailed(
      "Can't get the pull request number" +
        "Please submit an issue on this action's GitHub repo if you believe this in correct.",
    );
    return;
  }

  const pullRequestNumber = pull_request.number;

  // Create GitHub client with the API token.
  const octokitClient = new Octokit();
  const octokitPullRequest = octokitClient.rest.pulls;
  const octokitIssues = octokitClient.rest.issues;

  // Get the diff content of the PR.
  const response = await octokitPullRequest.get({
    ...context.repo,
    pull_number: pullRequestNumber,
    mediaType: {
      format: 'diff',
    },
  });

  const listOfFiles = await octokitPullRequest.listFiles({
    ...context.repo,
    pull_number: pull_request?.number,
    mediaType: {
      format: 'diff',
    },
  });

  // Ensure that the request was successful.
  if (response.status !== 200) {
    core.setFailed(
      `The GitHub API for comparing the base and head commits for this ${eventName} event returned ${response.status}, expected 200. ` +
        "Please submit an issue on this action's GitHub repo.",
    );
  }
  // @todo
  // Ensure that payload sent to OpenAI is not too big.
  // if (response.data.length > 2048) {
  //   core.setFailed(
  //     `The commit have too much changes. ` +
  //     "Please submit an issue on this action's GitHub repo."
  //   )
  // }

  /**
   * Objectives
   * Code Style: Checking if the code adheres to predefined style guidelines.
      Code Quality: Looking for common programming errors, potential bugs, and code smells.
      Security: Identifying security vulnerabilities like SQL injections or buffer overflows.
      Documentation: Ensuring that new code is properly documented.
      Test Coverage: Verifying that new code includes adequate unit tests.
   */

  const prompt = `You are a bot grouping a list of files included in the Pull Request along with their respective paths and types (if possible, determine the programming language) from
    ${listOfFiles.data}
    that resulted from the github client`;

  // const text = await AzureOpenAIExec(`Write a description for this git diff: \n ${response.data}`);
  const text = await AzureOpenAIExec(prompt);
  // The output of this action is the text from OpenAI trimmed and escaped
  core.setOutput('text', text.replace(/(\r\n|\n|\r|'|"|`|)/gm, ''));

  if (core.getInput('bot-comment', { required: false }) === 'true') {
    // 1. Retrieve existing bot comments for the PR
    const { data: comments } = await octokitIssues.listComments({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: context.issue.number,
    });
    const botComment = comments.find(comment => {
      return (
        comment.user?.type === 'Bot' &&
        comment.body?.includes('Go1 OpenAI Bot Review')
      );
    });
    // 2. Prepare format of the comment
    const output = `#### Go1 OpenAI Bot Review 🖌

${text}

*Pusher: @${context.actor}, Action: \`${context.eventName}\`, Workflow: \`${context.workflow}\`*
`;

    // 3. If we have a comment, update it, otherwise create a new one
    if (botComment) {
      octokitIssues.updateComment({
        owner: context.repo.owner,
        repo: context.repo.repo,
        comment_id: botComment.id,
        body: output,
      });
    } else {
      octokitIssues.createComment({
        issue_number: context.issue.number,
        owner: context.repo.owner,
        repo: context.repo.repo,
        body: output,
      });
    }
  }
};

main().catch(err => {
  if (err instanceof Error) {
    core.setFailed(err.message);
  }
  console.error(err);
});
