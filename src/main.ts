import * as core from '@actions/core';
import { context } from '@actions/github';
import { Octokit } from '@octokit/action';
import { AzureOpenAIExec } from './azure-openai';
import type { GetResponseTypeFromEndpointMethod } from '@octokit/types';
import { checkEventName } from './helpers/event-name-check';
import { getPullRequestNumber } from './helpers/pull-request';

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

  if (!checkEventName(context, eventName)) return;

  const pullRequestNumber = getPullRequestNumber(context.payload);
  if (!pullRequestNumber) return;

  const { octokitPullRequest, octokitIssues } = createOctokitClient();

  const { data: listAssignees } = await octokitIssues.listAssignees({
    ...repo,
    issue_number: issueNumber,
  });

  if (!listAssignees.find(assignee => assignee.login === actor)) {
    octokitIssues.addAssignees({
      ...repo,
      issue_number: issueNumber,
      assignees: [actor],
    });
  }

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
  const {
    data: { body },
    status,
  }: GetResponseTypeFromEndpointMethod<typeof octokitPullRequest.get> =
    await octokitPullRequest.get(requestBaseParams);
  if (status !== 200) {
    core.setFailed(
      `The GitHub API for comparing the base and head commits for this ${eventName} event returned ${status}, expected 200. ` +
        "Please submit an issue on this action's GitHub repo.",
    );
  }

  const listOfFiles = await octokitPullRequest.listFiles(requestBaseParams);
  if (!body || body?.length === 0) {
    let prompt = `Generate a concise description for pull request #${pullRequestNumber} in the repository ${repo}.
                  - The pull request includes changes in the following files: ${listOfFiles.data.map(file => file.filename).join(', ')}.
                  - The description should provide a high-level overview of the changes and the purpose of the pull request.`;

    const text = await AzureOpenAIExec(prompt);
    core.setOutput('text', text.replace(/(\r\n|\n|\r|'|"|`|)/gm, ''));
    octokitPullRequest.update({
      ...repo,
      pull_number: pullRequestNumber,
      body: text,
    });
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

  if (comments.length > listOfFiles.data.length) {
    const unusedComments = comments.filter(comment => {
      return !listOfFiles.data.some(file =>
        comment.body?.includes(file.filename),
      );
    });
    if (unusedComments.length > 0) {
      for (const comment of unusedComments) {
        octokitIssues.deleteComment({
          owner: repo.owner,
          repo: repo.repo,
          comment_id: comment.id,
        });
      }
    }
  }

  for (const file of listOfFiles.data) {
    let prompt = `Review ${file.filename} in PR #${pullRequestNumber}. 
                  Provide concise feedback only on aspects that require attention or improvement. 
                  Use bullet points for each category, including code snippets if applicable.
                  If an aspect is already correct or good or consistent or does not require attention, do not give feedback on this aspect.
                  Focus on areas where improvements are necessary or where issues have been identified:

                  - Code Quality:
                    - Check for any syntax errors or unusual constructs.
                    - Review formatting for consistency with project guidelines.
                    - Assess naming conventions for clarity and consistency with best practices.
                    - Identify any unused or redundant code.

                  - Logic and Complexity:
                    - Evaluate for potential infinite loops or unoptimized loops.
                    - Suggest improvements to enhance code efficiency or readability.
                    - Review for unnecessary complexity or overly complicated structures.
                    - Check for repeated code blocks that could be simplified or abstracted.

                  - Performance and Scalability:
                    - Analyze performance bottlenecks or areas that may not scale well.

                  - Security and Error Handling:
                    - Examine the code for potential security vulnerabilities.
                    - Review error handling for robustness against exceptions and edge cases.

                  - Maintainability and Readability:
                    - Evaluate the code's maintainability, considering modularity and coupling.
                    - Assess readability and structure of the code.
                    - Check if comments are sufficient and meaningful, especially for complex logic.

                  - Testing and Documentation:
                    - Review testability of the code and suggest areas lacking adequate tests.
                    - Assess the coverage and quality of existing tests.
                    - Examine the adequacy of documentation, particularly public interfaces and complex algorithms.`;

    const text = await AzureOpenAIExec(prompt);
    core.setOutput('text', text.replace(/(\r\n|\n|\r|'|"|`|)/gm, '')); // The output of this action is the text from OpenAI trimmed and escaped

    if (core.getInput('bot-comment', { required: false }) === 'true') {
      const botComment = comments.find(comment => {
        return (
          comment.user?.type === 'Bot' &&
          comment.body?.includes(
            `#### Go1 OpenAI Bot Review - ${file.filename} 🖌`,
          )
        );
      });

      const output = `#### Go1 OpenAI Bot Review - ${file.filename} 🖌
                      ${text}`;

      if (botComment) {
        octokitIssues.updateComment({
          owner: context.repo.owner,
          repo: context.repo.repo,
          comment_id: botComment.id,
          body: output,
        });
      } else {
        octokitIssues.createComment({
          issue_number: context.issue.number,
          owner: context.repo.owner,
          repo: context.repo.repo,
          body: output,
        });
      }
    }
  }
};

main().catch(err => {
  if (err instanceof Error) {
    core.setFailed(err.message);
  }
  console.error(err);
});
