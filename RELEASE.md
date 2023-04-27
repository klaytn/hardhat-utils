# Release process

## Tag first rc of the next version (e.g., v0.0.2-rc.1)

1. Update version in `package.json`
2. Make PR to dev branch
3. Once merged, run `release_rc.sh` on dev (this will create a sign-off PR. DO NOT merge this PR yet)

## Tag the following rc (e.g., v0.0.2-rc.2)

1. Run `release_rc.sh` on dev (this will automatically append to the sign-off PR. DO NOT merge this PR yet)

## Release rc

1. Merge sign-off PR (created by tagging rc)
