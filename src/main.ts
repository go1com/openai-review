import * as core from '@actions/core';
import { context } from '@actions/github';
import { Octokit } from '@octokit/action';
import { AzureOpenAIExec } from './azure-openai';
import type { GetResponseTypeFromEndpointMethod } from "@octokit/types";

const createOctokitClient = () => {
  const octokitClient = new Octokit();
  return {
    octokitPullRequest: octokitClient.rest.pulls,
    octokitIssues: octokitClient.rest.issues,
  };
};

const main = async (): Promise<void> => {
  const {
    eventName,
    payload: { pull_request },
    issue: { number: issueNumber },
    actor,
    repo,
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
      'Unable to retrieve the pull request number. Please ensure the pull request number is valid and try again.' +
        "Please submit an issue on this action's GitHub repo if you believe this in correct.",
    );
    return;
  }

  const pullRequestNumber = pull_request.number;
  const { octokitPullRequest, octokitIssues } = createOctokitClient();

  const {data: listAssignees} = await octokitIssues.listAssignees({
    ...repo,
    issue_number: issueNumber,
  });

  if (!listAssignees.find(assignee => assignee.login === actor)) {
    octokitIssues.addAssignees({
      ...repo,
      issue_number: issueNumber,
      assignees: [actor],
    });
  }

  /**
   * @todo Add reviewers to the pull request.
   */
  octokitPullRequest.requestReviewers({
    ...repo,
    pull_number: pullRequestNumber,
    reviewers: [],
  });

  const requestBaseParams = {
    ...repo,
    pull_number: pullRequestNumber,
    mediaType: {
      format: 'diff',
    },
  };
  const {data: { body }, status }: GetResponseTypeFromEndpointMethod<typeof octokitPullRequest.get> = await octokitPullRequest.get(requestBaseParams);
  if (status !== 200) {
    core.setFailed(
      `The GitHub API for comparing the base and head commits for this ${eventName} event returned ${status}, expected 200. ` +
        "Please submit an issue on this action's GitHub repo.",
    );
  }

  const listOfFiles = await octokitPullRequest.listFiles(requestBaseParams);
  if (!body) {
    let prompt = `Generate a description for pull request #${pullRequestNumber} in the repository ${repo}.`;
    prompt += `The pull request includes changes in the following files: ${listOfFiles.data.map(file => file.filename).join(', ')}.`

    const text = await AzureOpenAIExec(prompt);
    core.setOutput('text', text.replace(/(\r\n|\n|\r|'|"|`|)/gm, ''));
    octokitPullRequest.update({
      ...repo,
      pull_number: pullRequestNumber,
      body: text
    })
  }

  const numberOfLinesChanged = listOfFiles.data.reduce(
    (total, file) => total + file.changes + file.additions + file.deletions,
    0,
  );

  if (numberOfLinesChanged > 2048) {
    core.setFailed(
      `The commit has too many changes. ` +
        "Please submit an issue on this action's GitHub repo.",
    );
  }

  const { data: comments } = await octokitIssues.listComments({
    owner: repo.owner,
    repo: repo.repo,
    issue_number: issueNumber,
  });

  for (const file of listOfFiles.data) {
    const prompt = `Review ${file.filename} in PR #${pullRequestNumber} for:
                  - New additions, deletions, or updates
                  - Syntax review if logic is present
                  - Infinite loop potential if logic is present
                  - Code improvement areas
                  - Possible security enhancements
                  - Verify code formatting based on the style guide of the language used
                  - Check for code duplication
                  - Validate test coverage
                  - Suggest removal of unused code or comments
                  - No need to explain, just provide the feedback.`;

    const text = await AzureOpenAIExec(prompt);
    core.setOutput('text', text.replace(/(\r\n|\n|\r|'|"|`|)/gm, '')); // The output of this action is the text from OpenAI trimmed and escaped

    if (core.getInput('bot-comment', { required: false }) === 'true') {
      const botComment = comments.find(comment => {
        return (
          comment.user?.type === 'Bot' &&
          comment.body?.includes(
            `#### Go1 OpenAI Bot Review - ${file.filename} 🖌`,
          )
        );
      });

      const output = `#### Go1 OpenAI Bot Review - ${file.filename} 🖌
                      ${text}`;

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
  }
};

main().catch(err => {
  if (err instanceof Error) {
    core.setFailed(err.message);
  }
  console.error(err);
});
