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
  const overalInstructions = `Overal instructions: 
  - Review should have no more than 50 words.
  - Use simple and concise language.
  - Use bullet points when applicable for easy reading.`;
  
  const condition1 = `Answer yes or no for this question.`;
  const condition2 = `If the answer is no, remove this item, do not write anything. If the answer is yes, provide review with the following instruction: ${overalInstructions}. `

  const codeQuality = `Code quality:
  - ${condition1}. Are there any syntax errors or unusual constructs? ${condition2}.
  - ${condition1}. Are naming conventions clear and consistent with best practices? ${condition2}.
  - ${condition1}. Are there any unused or redundant code? ${condition2}
  - If there is no code quality issue for the above questions of this category, remove this section entirely.`;

  const logicAndComplexity = `Logic and complexity:
  - ${condition1}. Are there any potential infinite loops or unoptimized loops? ${condition2}.
  - ${condition1}. Are there any areas that could be simplified or abstracted? ${condition2}.
  - ${condition1}. Are there any unnecessary complexity or overly complicated structures? ${condition2}.
  - If there is no logic and complexity issue, remove this section.`;

  const performanceAndScalability = `Performance and Scalability:
  - ${condition1}. Are there any performance bottlenecks or areas that may not scale well? ${condition2}.
  - If there is no performance and scalability issue, remove this section.`;

  const securityAndErrorHandling = `Security and Error Handling:
  - ${condition1}. Are there any potential security vulnerabilities? ${condition2}.
  - ${condition1}. Are there any error handling for robustness against exceptions and edge cases? ${condition2}.
  - If there is no security and error handling issue, remove this section.`;

  const testingAndDocumentation = `Testing and Documentation:
  - ${condition1}. Are there any missing or inadequate tests? ${condition2}.
  - ${condition1}. Are there any missing or inadequate documentation? ${condition2}.
  - If there is no testing and documentation issue, remove this section.`;

  return `Write code review for ${fileName} in PR #${pullRequestNumber}. 
  Categories to review:
  1. ${codeQuality}
  2. ${logicAndComplexity}
  3. ${performanceAndScalability}
  4. ${securityAndErrorHandling}
  5. ${testingAndDocumentation}`;
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

    if (text === '') {
      if (currentCommentsOfTheFile.length > 0) {
        await deleteAllBotCommentsOfAFile(
          issues,
          context,
          existingComments,
          file.filename,
        );
      }

      continue;
    }

    core.setOutput('text', text.replace(/(\r\n|\n|\r|'|"|```|)/gm, '')); // The output of this action is the text from OpenAI trimmed and escaped
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
