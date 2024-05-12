# OpenAI Review: An AI-Powered Code Review Tool!
This repository is the home of the 'openai-review' project, a platform designed to streamline the process of reviewing and providing insightful feedback on Pull Requests. By leveraging the power of OpenAI, it aims to enhance collaboration and code quality in our Go1 Engineering teams.

# Current capabilities of OpenAI Review
OpenAI Review is a powerful tool designed to streamline your development workflow. Here's what it can do for you:
- **Automated Pull Request Assignments**: No more manual assignments. OpenAI Review can automatically assign an assignee to a Pull Request, saving you time and effort.

- **Intelligent Reviewer Selection**: OpenAI Review can assign reviewers to a Pull Request, ensuring the right eyes are on your code.

- **Dynamic Pull Request Descriptions**: Writing a Pull Request description can be tedious. Let OpenAI Review do it for you, generating concise and informative descriptions.

- **Comprehensive File Reviews**: OpenAI Review provides an overall review of each changed file in your Pull Request, giving you a high-level view of the changes.

- **Discover More**: OpenAI Review is packed with additional features waiting for you to discover and utilize. Plus, we welcome contributions to make this tool even better!

## Getting Started

### How to contribute to this project
To contribute to this project, follow these steps:

1. Clone the repository: `git clone git@github.com:go1com/openai-review.git`
2. Navigate to the project directory: `cd openai-review`
3. Install the dependencies: `npm install`
4. Checkout to your new branch and start making changes
5. Test your changes - Details instruction in [How to test your OpenAI Review changes in your project](#how-to-test-your-openai-review-changes-in-your-project)
6. Push, commit and request review

### How to test your OpenAI Review changes in your project
To use OpenAI Review in your project, follow these steps:

1. From `.github/workflows` in your project repository, create a `pr-review.yml` file with the following codes:

```
name: "PR Review"
on:
  pull_request:
    types: [opened, synchronize, reopened, edited]
defaults:
  run:
    working-directory: ./
jobs:
  openai_review:
    name: "Azure OpenAI Review"
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
    env:
      AZURE_OPENAI_API_KEY: ${{ secrets.AZURE_OPENAI_API_KEY }}
      AZURE_OPENAI_ENDPOINT: ${{ vars.AZURE_OPENAI_ENDPOINT }}
    steps:
    - name: Azure OpenAI
      uses: go1com/openai-review  #Use go1com/openai-review@[your-branch-name] if you want to test changes in your develop-branch
      if: github.event_name == 'pull_request'
      id: openai
      with:
        azure-openai-api-key: ${{ env.AZURE_OPENAI_API_KEY }}
        azure-openai-endpoint: ${{ env.AZURE_OPENAI_ENDPOINT }}
        bot-comment: true
    - name: Print
      run: |
        echo  "${{ steps.openai.outputs.text}}"
```
2. When you create a new Pull Request, you will see a `PR Review` job running in your branch
![alt text](<./media/Screenshot 2024-05-07 at 8.52.09 AM.png>)



