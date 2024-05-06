import * as core from '@actions/core';
import { context } from '@actions/github';
import { Octokit } from '@octokit/action';
import { checkEventName } from './helpers/event-name-check';
import {
  addPullRequestDescription,
  getPullRequest,
  getPullRequestNumber,
} from './helpers/pull-request';
import { addAssignees } from './helpers/assignees';
import { addReviewers } from './helpers/reviewers';
import { getChangedFiles, limitLinesChanged } from './helpers/changed-files';
import { writeBotComments } from './helpers/comments';

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
    payload,
    issue: { number: issueNumber },
    repo,
  } = context;

  if (!checkEventName(context, eventName)) return;

  const pullRequestNumber = getPullRequestNumber(payload);
  if (!pullRequestNumber) return;

  const { octokitPullRequest, octokitIssues } = createOctokitClient();

  // 1. Assign the issue to the PR author.
  await addAssignees(context, octokitIssues, issueNumber);

  /**
   * 2. Add reviewers to the PR.
   * @todo Assign reviewers to the addReviews method once groups/teams are set on GitHub.
   */
  await addReviewers(context, octokitPullRequest, pullRequestNumber);

  const requestBaseParams = {
    ...repo,
    pull_number: pullRequestNumber,
    issue_number: issueNumber,
    mediaType: {
      format: 'diff',
    },
  };

  const pullRequest = await getPullRequest(
    octokitPullRequest,
    requestBaseParams,
    pullRequestNumber,
  );
  if (!pullRequest) return;

  const listOfFiles = await getChangedFiles(
    octokitPullRequest,
    requestBaseParams,
  );
  if (!listOfFiles) return;

  // 3. Add a description to the PR.
  await addPullRequestDescription(
    octokitPullRequest,
    pullRequestNumber,
    pullRequest,
    context,
    listOfFiles,
  );

  if (!limitLinesChanged(listOfFiles)) return;

  // 4. Write bot comments.
  await writeBotComments(
    octokitIssues,
    context,
    issueNumber,
    pullRequestNumber,
    listOfFiles,
  );
};

main().catch(err => {
  if (err instanceof Error) {
    core.setFailed(err.message);
  }
  console.error(err);
});
