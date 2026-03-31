Prepare a commit with the current project changes.

Steps:
1. Run `git status` and `git diff` to review changes
2. Ask the user what commit message to use (suggest one based on the changes)
3. `git add` the relevant files and `git commit`
4. Inform the user the commit is ready

**NEVER push automatically.** Only push if the user explicitly asks after the commit.
