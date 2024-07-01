<h1>
  🌟 GO1 OpenAI Review 
  <img src="./media/go1logo.png" alt="GO1Logo" align="right">
</h1>
This repository is the home of the 'openai-review' project, a tool designed to streamline the process of reviewing and providing insightful feedback on Pull Requests. By leveraging the power of OpenAI, it aims to enhance collaboration and code quality in our Go1 Engineering teams with the possibility to open source in the future.

🙏 OpenAI Review is in its exciting early stages of development. We warmly invite you to contribute and join us on this journey to shape the tool's future, enhancing its usability and making it even better. Your ideas and contributions can make a real difference! 🙏

<br><br>

# 📚 Table of Contents

1. [Current capabilities of OpenAI Review](#🎉-current-capabilities-of-openai-review)
2. [Project Owner](#🧑‍🚒-project-owner)
3. [Getting Started](#🍀-getting-started)
   - [Project issues and brainstorming](#🧐-project-issues-and-brainstorming)
   - [How to contribute to this project](#🤝-how-to-contribute-to-this-project)
   - [How to test your OpenAI Review changes in your project](#🧪-how-to-test-your-openai-review-changes-in-your-project)

<br><br>

# 🎉 Current capabilities of OpenAI Review

OpenAI Review is a tool designed to streamline your development workflow. Here's what it can do for you:

- Automatically assign an assignee to a Pull Request.

- Assign reviewers to a Pull Request.

- Generate concise and informative descriptions.

- Provide an overall review of each changed file in your Pull Request.

<br><br>

# 🧑‍🚒 Project Owner
We are working on finding the right owner for this project. Meanwhile, code reviews can be sent to the AAA team

<br><br>

# 🍀 Getting Started

## 🧐 Project issues and brainstorming

- Project document can be found in [Project Confluence Space](https://go1web.atlassian.net/wiki/spaces/ACR/overview)
- You can find open tickets in [Project Backlog](https://go1web.atlassian.net/jira/software/projects/ACR/boards/1635/backlog) to start working on.
- If you encounter any issues, or have any ideas for improvement, please create tickets with us in [Project Backlog](https://go1web.atlassian.net/jira/software/projects/ACR/boards/1635/backlog)

<br>

## 🤝 How to make code changes to this project

To make code changes to this project, follow these steps:

1. Clone the repository: `git clone git@github.com:go1com/openai-review.git`
2. Navigate to the project directory: `cd openai-review`
3. Install the dependencies: `npm install`
4. Checkout to your new branch and start making changes
5. Test your changes - Details instruction in [How to test your OpenAI Review changes in your project](#how-to-test-your-openai-review-changes-in-your-project)
6. Run `npm run pack`
7. Push, commit and request review

<br>

## 🧪 How to test your OpenAI Review changes in your project

To use OpenAI Review in your project, follow these steps:

1. Request for Azure OpenAI key and endpoint access.
2. Create environment secret/variable for the Azure OpenAI key and endpoint in your project. In the following sample code, we use`secrets.AZURE_OPENAI_API_KEY` and`vars.AZURE_OPENAI_ENDPOINT` .
3. From `.github/workflows` in your project repository, create a new file for the code review job. Here is the sample code:

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
      uses: go1com/openai-review  #Use go1com/openai-review@[your-branch-name] OR go1com/openai-review@[deployment-tag]
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

You can follow along with [this tutorial][1] as well 
[1]: https://www.loom.com/share/7dfceb0d1ea747ebbe610202c5ee9ed7 "this tutorial"

4. When you create a new Pull Request, you will see a `PR Review` job running in your branch

![PR Review Screenshot](<./media/Screenshot 2024-05-07 at 8.52.09 AM.png>)
