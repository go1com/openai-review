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
      `This action only supports Pull Requests, ${eventName} events are not supported. ` +
        "Please submit an issue on this action's GitHub repo if you believe this in correct.",
    );
    return;
  }

  if (!pull_request?.number) {
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
    pull_number: pullRequestNumber,
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

  let numberOfLinesChanged = 0;
  for (const file of listOfFiles.data) {
    numberOfLinesChanged = file.changes + file.additions + file.deletions;
  }

  if (numberOfLinesChanged > 2048) {
    core.setFailed(
      `The commit have too much changes. ` +
        "Please submit an issue on this action's GitHub repo.",
    );
  }

  for (const file of listOfFiles.data) {
    // const prompt = `Please list the new, deleted, or updated files in pull request #${pullRequestNumber}.
    //   Changed files include: \n${listOfFiles.data.map(file => file.filename).join('\n')}.`;

    const prompt = `Please review the file ${file.filename} in pull request #${pullRequestNumber} if it's newly added, deleted, or updated.`;

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
    
    ${text}`;

      // *Author: @${context.actor}, Action: \`${context.eventName}\`, Workflow: \`${context.workflow}\`*
      // 3. If we have a comment, update it, otherwise create a new one
      // if (botComment) {
      //   octokitIssues.updateComment({
      //     owner: context.repo.owner,
      //     repo: context.repo.repo,
      //     comment_id: botComment.id,
      //     body: output,
      //   });
      // } else {
      //   octokitIssues.createComment({
      //     issue_number: context.issue.number,
      //     owner: context.repo.owner,
      //     repo: context.repo.repo,
      //     body: output,
      //   });
      // }

      octokitPullRequest.createReview({
        ...context.repo,
        pull_number: pullRequestNumber,
        body: output,
        event: 'COMMENT',
      });

      // octokitIssues.createComment({
      //   issue_number: context.issue.number,
      //   owner: context.repo.owner,
      //   repo: context.repo.repo,
      //   body: output,
      // });
    }
  }
};

main().catch(err => {
  if (err instanceof Error) {
    core.setFailed(err.message);
  }
  console.error(err);
});
