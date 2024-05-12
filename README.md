<h1>
  🌟 GO1 OpenAI Review 
  <img src="./media/go1logo.png" alt="GO1Logo" align="right">
</h1>
This repository is the home of the 'openai-review' project, a tool designed to streamline the process of reviewing and providing insightful feedback on Pull Requests. By leveraging the power of OpenAI, it aims to enhance collaboration and code quality in our Go1 Engineering teams.

🙏 OpenAI Review is in its exciting early stages of development. We warmly invite you to contribute and join us on this journey to shape the tool's future, enhancing its usability and making it even better. Your ideas and contributions can make a real difference! 🙏



# 📚 Table of Contents
1. [Current capabilities of OpenAI Review](#🎉-current-capabilities-of-openai-review)
2. [Getting Started](#🍀-getting-started)
   - [Project issues and brainstorming](#🧐-project-issues-and-brainstorming)
   - [How to contribute to this project](#🤝-how-to-contribute-to-this-project)
   - [How to test your OpenAI Review changes in your project](#🧪-how-to-test-your-openai-review-changes-in-your-project)



# 🎉 Current capabilities of OpenAI Review
OpenAI Review is a tool designed to streamline your development workflow. Here's what it can do for you:
- Automatically assign an assignee to a Pull Request.

- Assign reviewers to a Pull Request.

- Generate concise and informative descriptions.

- Provide an overall review of each changed file in your Pull Request.



# 🍀 Getting Started

## 🧐 Project issues and brainstorming
- You can find open issues in [Project issues](https://github.com/go1com/openai-review/issues) to start working on.
- If you encounter any issues, or have any ideas for improvement, please create issues in [Project issues](https://github.com/go1com/openai-review/issues)


## 🤝 How to make code changes to this project
To make code changes to this project, follow these steps:

1. Clone the repository: `git clone git@github.com:go1com/openai-review.git`
2. Navigate to the project directory: `cd openai-review`
3. Install the dependencies: `npm install`
4. Checkout to your new branch and start making changes
5. Test your changes - Details instruction in [How to test your OpenAI Review changes in your project](#how-to-test-your-openai-review-changes-in-your-project)
6. Push, commit and request review


## 🧪 How to test your OpenAI Review changes in your project
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

![PR Review Screenshot](<./media/Screenshot 2024-05-07 at 8.52.09 AM.png>)

