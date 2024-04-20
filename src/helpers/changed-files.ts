import * as core from '@actions/core';
import { Octokit, RestEndpointMethodTypes } from '@octokit/action';

export const getChangedFiles = async (
  pullRequest: Octokit['rest']['pulls'],
  requestParams: RestEndpointMethodTypes['pulls']['listFiles']['parameters'],
): Promise<
  RestEndpointMethodTypes['pulls']['listFiles']['response']['data'] | null
> => {
  const result = await pullRequest.listFiles(requestParams);
  if (result.status !== 200) {
    core.setFailed(
      `The GitHub API for listing changedFiles of this Pull Requests returned ${result.status}, expected 200. `,
    );

    return null;
  }
  return result.data;
};

export const limitLinesChanged = (
  listOfFiles: RestEndpointMethodTypes['pulls']['listFiles']['response']['data'],
) => {
  const numberOfLinesChanged = listOfFiles.reduce(
    (total, file) => total + file.changes + file.additions + file.deletions,
    0,
  );

  if (numberOfLinesChanged > 2048) {
    core.setFailed(
      `The commit has too many changes. ` +
        "Please submit an issue on this action's GitHub repo.",
    );
  }
};
