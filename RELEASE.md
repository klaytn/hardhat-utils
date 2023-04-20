# Release process

## Tag rc

1. Update version in `package.json`
2. Make PR to dev branch
3. Once merged, run `release_rc.sh` on dev
4. This will create a sign-off PR (do not merge yet)

## Release rc

1. Merge sign-off PR (created by tagging rc)
