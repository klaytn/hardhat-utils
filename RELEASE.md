# Release process

## Tag rc

1. Run `git tag v0.0.1-rc.1`
2. `git push --tag`

## Release rc

1. Update version in `package.json`
2. Make a PR for 1
3. Merge PR
4. Run `release_rc.sh`. Make sure this is run after the PR is merged.
