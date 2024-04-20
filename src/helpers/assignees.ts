import { context } from '@actions/github';
import { Octokit, RestEndpointMethodTypes } from '@octokit/action';

const getAssignees = async (
  issues: Octokit['rest']['issues'],
  issueNumber: number,
): Promise<
  RestEndpointMethodTypes['issues']['listAssignees']['response']['data'] | null
> => {
  const result = await issues.listAssignees({
    ...context.repo,
    issue_number: issueNumber,
  });

  if (result.status !== 200) {
    return null;
  }

  return result.data;
};

export const addAssignees = async (
  issues: Octokit['rest']['issues'],
  issueNumber: number,
): Promise<void> => {
  const assignees = await getAssignees(issues, issueNumber);
  if (!assignees) return; // It's not critical to add assignees. Should keep going with the process.

  if (!assignees.find(assignee => assignee.login === context.actor)) {
    issues.addAssignees({
      ...context.repo,
      issue_number: issueNumber,
      assignees: [context.actor],
    });
  }
};
