# Release process

## Tag rc

1. Update version in `package.json`
2. Make PR to main branch
3. Once merged, run `git tag v0.0.1-rc.1` on main
4. `git push --tag`

## Release rc

1. Make a PR for 1
2. Merge PR
3. Run `release_rc.sh`. Make sure this is run after the PR is merged.
