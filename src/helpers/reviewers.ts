import { Context } from '@actions/github/lib/context';
import { Octokit } from '@octokit/action';

export const addReviewers = async (
  context: Context,
  pullRequest: Octokit['rest']['pulls'],
  pullRequestNumber: number,
) => {
  await pullRequest.requestReviewers({
    ...context.repo,
    pull_number: pullRequestNumber,
    reviewers: [],
  });
};
