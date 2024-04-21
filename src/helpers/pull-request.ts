import * as core from '@actions/core';
import { AzureOpenAIExec } from '../azure-openai';
import { Context } from '@actions/github/lib/context';
import { WebhookPayload } from '@actions/github/lib/interfaces';
import { Octokit, RestEndpointMethodTypes } from '@octokit/action';

export const getPullRequestNumber = (
  payload: WebhookPayload,
): number | null => {
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
  pullRequestRest: Octokit['rest']['pulls'],
  params: RestEndpointMethodTypes['pulls']['get']['parameters'],
  pullRequestNumber: number,
): Promise<
  RestEndpointMethodTypes['pulls']['get']['response']['data'] | null
> => {
  const result = await pullRequestRest.get({
    ...params,
    headers: {
      Accept: 'application/vnd.github+json,application/vnd.github.diff',
    },
  });

  if (result.status !== 200) {
    core.setFailed(
      `The GitHub API for getting pull request #${pullRequestNumber} resulted in status ${result.status}, expected 200. ` +
        "Please submit an issue on this action's GitHub repo.",
    );

    return null;
  }

  return result.data;
};

export const getIssue = async (
  issuesRest: Octokit['rest']['issues'],
  params: RestEndpointMethodTypes['issues']['get']['parameters'],
  issueNumber: number,
) => {
  const result = await issuesRest.get({
    ...params,
    headers: {
      Accept: 'application/vnd.github+json,application/vnd.github.diff',
    },
  });

  if (result.status !== 200) {
    core.setFailed(
      `The GitHub API for getting issue of the pull request #${issueNumber} resulted in status ${result.status}, expected 200. ` +
        "Please submit an issue on this action's GitHub repo.",
    );

    return null;
  }

  return result.data;
};

export const addPullRequestDescription = async (
  issueRequestRest: Octokit['rest']['issues'],
  issueNumber: number,
  context: Context,
  listOfFiles: RestEndpointMethodTypes['pulls']['listFiles']['response']['data'],
) => {
  const issue = await getIssue(
    issueRequestRest,
    {
      ...context.repo,
      issue_number: issueNumber,
      mediaType: {
        format: 'diff',
      },
    },
    issueNumber,
  );
  if (!issue) return;

  issueRequestRest.createComment({
    ...context.repo,
    issue_number: issueNumber,
    body: `${issue.body}`,
  });

  if (!issue.body) {
    const prompt = `Generate a concise description for pull request #${issueNumber} in the repository ${context.repo.repo}.
                  - The pull request includes changes in the following files: ${listOfFiles.map(file => file.filename).join(', ')}.
                  - The description should provide a high-level overview of the changes and the purpose of the pull request.`;

    const text = await AzureOpenAIExec(prompt);
    core.setOutput('text', text.replace(/(\r\n|\n|\r|'|"|`|)/gm, ''));
    await issueRequestRest.update({
      ...context.repo,
      issue_number: issueNumber,
      body: text,
    });
  }
};
