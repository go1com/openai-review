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
  return `Write code review for ${fileName} in PR #${pullRequestNumber}. 
          
          Overal instructions: 
          - Code review should only have maximum of 200 words.
          - Only provide feedback on the given categories that require attention or improvement. 
          - Do not write or give any feedback on a category that does not require attention or improvement.

          How code review should be written:
          - Write in a simple and concise language.
          - Use bullet points to explain for easy reading.
          - Include recommended code snippets where applicable

          Categories to review:
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

export const deleteAllBotCommentsOfAFile = async (
  issues: Octokit['rest']['issues'],
  context: Context,
  existingComments: RestEndpointMethodTypes['issues']['listComments']['response']['data'],
  fileName: string,
) => {
  if (core.getInput('bot-comment', { required: false }) === 'true') {
    const currentCommentsOfTheFile = existingComments.filter(comment => {
      return (
        comment.user?.type === 'Bot' &&
        comment.body?.includes(`#### Jason Derulo Review - ${fileName} 🖌`)
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
  const existingComments = await listComments(issues, context, issueNumber);
  if (typeof existingComments === 'string') return;

  for (const file of listOfFiles) {
    const prompt = promptForGeneratingBotComments(
      file.filename,
      pullRequestNumber,
    );
    const text = await AzureOpenAIExec(prompt);

    const currentCommentsOfTheFile = existingComments.filter(comment => {
      return (
        comment.user?.type === 'Bot' &&
        comment.body?.includes(
          `${file.filename}`,
        )
      );
    });
    file.patch = file.patch?.replace(/@@ -\d+,\d+ \+\d+,\d+ @@/g, '');
    if (file.patch) {
      issues.createComment({
        issue_number: context.issue.number,
          owner: context.repo.owner,
          repo: context.repo.repo,
          body: file.patch,
      })
      continue;
    }

    if (text === '') {
      if (currentCommentsOfTheFile.length > 0) {
        await deleteObsoleteBotCommentsOfAFile(
          issues,
          context,
          currentCommentsOfTheFile,
        );
      }

      continue;
    }

    core.setOutput('text', text.replace(/(\r\n|\n|\r|'|"|`|)/gm, '')); // The output of this action is the text from OpenAI trimmed and escaped
    const output = `#### Jason Derulo Review - ${file.filename} 🖌
                    ${text}`;

    if (core.getInput('bot-comment', { required: false }) === 'true') {
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
