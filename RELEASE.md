# Release process

## Tag first rc of the next version (e.g., v0.0.2-rc.1)

1. Update version in `package.json`
2. Make PR to dev branch
3. Once merged, run `release_rc.sh` on dev
4. This will create a sign-off PR (do not merge yet)

## Tag rc for the first time (e.g., v0.0.2-rc.2)

1. Run `release_rc.sh` on dev
2. This will append to the sign-off PR

## Release rc

1. Merge sign-off PR (created by tagging rc)
