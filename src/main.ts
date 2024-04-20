import * as core from '@actions/core';
import { context } from '@actions/github';
import { Octokit } from '@octokit/action';
import { AzureOpenAIExec } from './azure-openai';

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

  octokitIssues.addAssignees({
    ...repo,
    issue_number: issueNumber,
    assignees: [actor],
  });

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
  const response = await octokitPullRequest.get(requestBaseParams);
  const listOfFiles = await octokitPullRequest.listFiles(requestBaseParams);

  if (response.status !== 200) {
    core.setFailed(
      `The GitHub API for comparing the base and head commits for this ${eventName} event returned ${response.status}, expected 200. ` +
        "Please submit an issue on this action's GitHub repo.",
    );
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

  if (comments.length > 0) {
    octokitPullRequest.deleteReviewComment({
      owner: repo.owner,
      repo: repo.repo,
      comment_id: comments[0].id,
    });
    octokitIssues.deleteComment({
      owner: repo.owner,
      repo: repo.repo,
      comment_id: comments[0].id,
    });
  }

  for (const file of listOfFiles.data) {
    const prompt = `Please review the file ${file.filename} in pull request #${pullRequestNumber} if it's newly added, deleted, or updated and if the file contains security breach.`;

    const text = await AzureOpenAIExec(prompt);
    core.setOutput('text', text.replace(/(\r\n|\n|\r|'|"|`|)/gm, '')); // The output of this action is the text from OpenAI trimmed and escaped

    if (core.getInput('bot-comment', { required: false }) === 'true') {
      // const botComment = comments.find(comment => {
      //   return (
      //     comment.user?.type === 'Bot' && comment.body?.includes(file.filename)
      //   );
      // });

      const output = `#### Go1 OpenAI Bot Review - ${file.filename} 🖌
                      ${text}`;

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
// Path: src/azure-openai.ts
