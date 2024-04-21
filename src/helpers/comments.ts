import * as core from '@actions/core';
import { AzureOpenAIExec } from '../azure-openai';
import { Context } from '@actions/github/lib/context';
import { Octokit, RestEndpointMethodTypes } from '@octokit/action';

const listComments = async (
  issues: Octokit['rest']['issues'],
  context: Context,
  issueNumber: number,
): Promise<
  RestEndpointMethodTypes['issues']['listComments']['response']['data'] | string
> => {
  const result = await issues.listComments({
    ...context.repo,
    issue_number: issueNumber,
  });

  if (result.status !== 200) {
    core.setFailed(
      `The GitHub API for listing comments of this Pull Requests returned ${result.status}, expected 200. `,
    );

    return 'request failed';
  }

  return result.data;
};

const promptForGeneratingBotComments = (
  fileName: string,
  pullRequestNumber: number,
): string => {
  return `Review ${fileName} in PR #${pullRequestNumber}. 
          Provide concise feedback only on aspects that require attention or improvement. 
          Use bullet points for each category, including code snippets if applicable.
          If an aspect is already correct or good or consistent or does not require attention, DO NOT give feedback on this aspect.
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
};

const deleteAllBotCommentsOfAFile = async (
  issues: Octokit['rest']['issues'],
  context: Context,
  existingComments: RestEndpointMethodTypes['issues']['listComments']['response']['data'],
  fileName: string,
) => {
  if (core.getInput('bot-comment', { required: false }) === 'true') {
    const currentCommentsOfTheFile = existingComments.filter(comment => {
      return (
        comment.user?.type === 'Bot' &&
        comment.body?.includes(`#### Go1 OpenAI Bot Review - ${fileName} 🖌`)
      );
    });

    if (currentCommentsOfTheFile.length > 0) {
      for (const comment of currentCommentsOfTheFile) {
        await issues.deleteComment({
          ...context.repo,
          issue_number: context.issue.number,
          comment_id: comment.id,
        });
      }
    }
  }
};

const deleteObsoleteBotCommentsOfAFile = async (
  issues: Octokit['rest']['issues'],
  context: Context,
  obsolleteComments: RestEndpointMethodTypes['issues']['listComments']['response']['data'],
): Promise<void> => {
  const deletePromises = obsolleteComments.map(comment =>
    issues.deleteComment({
      ...context.repo,
      issue_number: context.issue.number,
      comment_id: comment.id,
    }),
  );

  await Promise.all(deletePromises);
};

export const writeBotComments = async (
  issues: Octokit['rest']['issues'],
  context: Context,
  issueNumber: number,
  pullRequestNumber: number,
  listOfFiles: RestEndpointMethodTypes['pulls']['listFiles']['response']['data'],
): Promise<void> => {
  for (const file of listOfFiles) {
    const existingComments = await listComments(issues, context, issueNumber);
    if (typeof existingComments === 'string') return;

    const prompt = promptForGeneratingBotComments(
      file.filename,
      pullRequestNumber,
    );
    const text = await AzureOpenAIExec(prompt);
    core.setOutput('text', text.replace(/(\r\n|\n|\r|'|"|`|)/gm, '')); // The output of this action is the text from OpenAI trimmed and escaped

    if (text === '') {
      await deleteAllBotCommentsOfAFile(
        issues,
        context,
        existingComments,
        file.filename,
      );
      continue;
    }

    const output = `#### Go1 OpenAI Bot Review - ${file.filename} 🖌
                    ${text}`;

    if (core.getInput('bot-comment', { required: false }) === 'true') {
      const currentCommentsOfTheFile = existingComments.filter(comment => {
        return (
          comment.user?.type === 'Bot' &&
          comment.body?.includes(
            `#### Go1 OpenAI Bot Review - ${file.filename} 🖌`,
          )
        );
      });

      if (currentCommentsOfTheFile.length === 0) {
        await issues.createComment({
          issue_number: context.issue.number,
          owner: context.repo.owner,
          repo: context.repo.repo,
          body: output,
        });
      } else if (currentCommentsOfTheFile.length === 1) {
        await issues.updateComment({
          owner: context.repo.owner,
          repo: context.repo.repo,
          comment_id: currentCommentsOfTheFile[0].id,
          body: output,
        });
      } else {
        await issues.updateComment({
          owner: context.repo.owner,
          repo: context.repo.repo,
          comment_id: currentCommentsOfTheFile[0].id,
          body: output,
        });

        currentCommentsOfTheFile.shift();
        await deleteObsoleteBotCommentsOfAFile(
          issues,
          context,
          currentCommentsOfTheFile,
        );
      }
    }
  }
};
