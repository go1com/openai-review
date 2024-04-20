import * as core from '@actions/core';
import { AzureOpenAIExec } from '../azure-openai';
import { Context } from '@actions/github/lib/context';
import { WebhookPayload } from '@actions/github/lib/interfaces';
import { Octokit, RestEndpointMethodTypes } from '@octokit/action';

export const getPullRequestNumber = async (
  payload: WebhookPayload,
): Promise<number | null> => {
  if (!payload.pull_request?.number) {
    core.setFailed(
      'Unable to retrieve the pull request number. Please ensure the pull request number is valid and try again.' +
        `Please submit an issue on this action's GitHub repo if you believe this in correct.`,
    );
    return null;
  }

  return payload.pull_request.number;
};

export const getPullRequest = async (
  pullRequest: Octokit['rest']['pulls'],
  params: RestEndpointMethodTypes['pulls']['get']['parameters'],
  eventName: string,
): Promise<
  RestEndpointMethodTypes['pulls']['get']['response']['data'] | null
> => {
  const result = await pullRequest.get({
    ...params,
    headers: {
      Accept: 'application/vnd.github+json,application/vnd.github.diff',
    },
  });

  if (result.status !== 200) {
    core.setFailed(
      `The GitHub API for comparing the base and head commits for this ${eventName} event returned ${result.status}, expected 200. ` +
        "Please submit an issue on this action's GitHub repo.",
    );

    return null;
  }

  return result.data;
};

export const addPullRequestDescription = async (
  pullRequest: Octokit['rest']['pulls'],
  body: RestEndpointMethodTypes['pulls']['get']['response']['data']['body'],
  pullRequestNumber: number,
  context: Context,
  listOfFiles: RestEndpointMethodTypes['pulls']['listFiles']['response']['data'],
) => {
  if (!body) {
    let prompt = `Generate a concise description for pull request #${pullRequestNumber} in the repository ${context.repo.repo}.
                  - The pull request includes changes in the following files: ${listOfFiles.map(file => file.filename).join(', ')}.
                  - The description should provide a high-level overview of the changes and the purpose of the pull request.`;

    const text = await AzureOpenAIExec(prompt);
    core.setOutput('text', text.replace(/(\r\n|\n|\r|'|"|`|)/gm, ''));
    await pullRequest.update({
      ...context.repo,
      pull_number: pullRequestNumber,
      body: text,
    });
  }
};
