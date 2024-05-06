import { Context } from '@actions/github/lib/context';
import { Octokit, RestEndpointMethodTypes } from '@octokit/action';

const getAssignees = async (
  context: Context,
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
  context: Context,
  issues: Octokit['rest']['issues'],
  issueNumber: number,
): Promise<void> => {
  const assignees = await getAssignees(context, issues, issueNumber);
  if (!assignees || assignees.length === 0) {
    await issues.addAssignees({
      ...context.repo,
      issue_number: issueNumber,
      assignees: [context.actor],
    });
  } else if (assignees.filter(assignee => assignee.login === context.actor).length === 0) {
    await issues.removeAssignees({
      ...context.repo,
      issue_number: issueNumber,
      assignees: assignees.map(assignee => assignee.login),
    })

    await issues.addAssignees({
      ...context.repo,
      issue_number: issueNumber,
      assignees: [context.actor],
    });
  }
  
  const before = assignees?.map(assignee => JSON.stringify(assignee));
  const after = await getAssignees(context, issues, issueNumber);
  const string = after?.map(assignee => JSON.stringify(assignee));

  issues.createComment({
    ...context.repo,
    issue_number: issueNumber,
    body: `Assignees before: ${before}.\n Assignees after: ${string}.\n Context actor: ${context.actor}.\n`,
  })
};
