import { context } from '@actions/github';
import { Octokit } from '@octokit/action';

export const addReviewers = async (
  pullRequest: Octokit['rest']['pulls'],
  pullRequestNumber: number,
) => {
  await pullRequest.requestReviewers({
    owner: context.repo.owner,
    repo: context.repo.repo,
    pull_number: pullRequestNumber,
    reviewers: [],
  });
};
