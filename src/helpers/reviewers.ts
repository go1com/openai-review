import * as core from '@actions/core';
import { context } from '@actions/github';
import { Octokit } from '@octokit/action';

export const addReviewers = async (
  pullRequest: Octokit['rest']['pulls'],
  pullRequestNumber: number,
) => {
  const result = await pullRequest.requestReviewers({
    owner: context.repo.owner,
    repo: context.repo.repo,
    pull_number: pullRequestNumber,
    reviewers: [],
  });

  if (result.status !== 201) {
    core.setFailed(
      `The GitHub API for adding reviewers to this pull request returned ${result.status}, expected 201. ` +
        "Please submit an issue on this action's GitHub repo.",
    );
  }
};
