# Contributing

Open or reuse an issue before implementation. Branch from `main` using
`<type>/<issue-number>-<description>`. Use Conventional Commits and open a PR
against `main` with a closing issue reference. Run `npm test` and wait for all
Linux, macOS and Windows CI jobs before merging with a merge commit.

The action uses clidoc's validation engine. Keep validation logic upstream;
this repository owns installation, input handling and GitHub Actions integration.
Never execute document contents or interpolate inputs into shell commands.

## Releases

After CI passes on main, create a GitHub Release with a new immutable semantic
version tag such as `v1.0.0`. Move the convenience `v1` tag only to a tested
release commit. Consumers should pin the full commit SHA. Document breaking
input/output or compatibility changes with a new major release. Publishing to
GitHub Marketplace is optional and requires the repository owner's Marketplace
setup; the action works from its repository without a Marketplace listing.

Update the default validator revision only after the new clidoc commit passes
the integration matrix. Published npm versions must expose `parseDocument` and
`detectDialect`. Update the parent repository's submodule and CI SHA together.
