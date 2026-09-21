# clidoc-action

[![CI](https://github.com/bhouston/clidoc-action/actions/workflows/ci.yml/badge.svg)](https://github.com/bhouston/clidoc-action/actions/workflows/ci.yml)

Validate OpenCLI JSON and YAML specifications in GitHub Actions with
[clidoc](https://github.com/bhouston/clidoc). Uses `@clidoc/core`, the same
validation engine as `clidoc validate`, including schema and logical checks.
Invalid documents fail the step. Linux, macOS and Windows hosted runners are tested.

## Usage

Check out your documents before invoking the action:

```yaml
name: Validate OpenCLI
on: [push, pull_request]
permissions:
  contents: read
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@d23441a48e516b6c34aea4fa41551a30e30af803 # v6
        with:
          persist-credentials: false
      - uses: bhouston/clidoc-action@v1
        with:
          files: opencli.json
          specification: bcdxn
```

`v1` follows compatible releases. For production, replace `v1` with the full
commit SHA of a reviewed release. Pinning the action also pins its default
validator source revision. Neither Marketplace registration nor adding a
submodule is required to use this action.

## Inputs

| Input | Default | Meaning |
| --- | --- | --- |
| `files` | Required | Newline-separated file paths. No globs; paths with spaces are supported. Blank lines are ignored; surrounding whitespace is trimmed. |
| `specification` | `auto` | `auto`, `bcdxn`, or `opencli-dev`. Explicit values reject documents in another dialect. |
| `format` | `auto` | `auto`, `json`, or `yaml`. This controls serialization, independently of the specification dialect. |
| `validator-version` | Empty | Exact published `@clidoc/core` npm version, such as `1.2.3`. Overrides `validator-ref`. Ranges, tags, URLs and local packages are rejected. |
| `validator-ref` | `04bde9553899737ac46e363da889f2fa729a4445` | Full commit SHA in `bhouston/clidoc`, used when `validator-version` is empty. |
| `working-directory` | `.` | Base directory for file paths, relative to the checked-out workspace. |

The pinned validator supports bcdxn OpenCLI `1.0.0-alpha.14` and opencli-dev
OpenCLI `0.1.0`. Unknown versions, conflicting dialect markers, malformed
JSON/YAML, missing files, and invalid documents fail. nrranjithnr OpenCLISpec is
unsupported. YAML accepts JSON syntax, as permitted by YAML; use `format: json`
to require strict JSON parsing. Dialect and schema versions are enforced by the
selected validator, not fetched from document URLs.

### Multiple documents

```yaml
- uses: bhouston/clidoc-action@v1
  with:
    working-directory: specifications
    files: |
      first.json
      second.yaml
```

### Validator selection

The clidoc npm packages were unpublished when this action was introduced.
The default therefore builds the validator from an immutable source commit,
using that commit's frozen pnpm lockfile. The initial pin is the dual-dialect
implementation commit from [clidoc PR #92](https://github.com/bhouston/clidoc/pull/92).
It does not follow a moving branch. Source revisions must retain compatible
workspace build scripts and expose `parseDocument` and `detectDialect`.

After a compatible package is published, set `validator-version` to that exact
published version. This installs only `@clidoc/core` and its runtime dependencies;
it does not compile the monorepo. Exact package versions do not lock transitive
npm dependency ranges. Source mode's frozen lockfile provides stronger dependency
reproducibility. The npm installation plan is unit tested; a real published
package smoke test must be added after the first compatible npm release.

Action version and validator version are independent. To select another reviewed
source revision, set `validator-ref` to its full 40-character commit SHA. Changing
the action reference is still necessary to receive action implementation fixes.

## Outputs

On success, `validated-count` contains the number of validated documents and
`validator` contains `git:<commit>` or `npm:<version>`. Neither is emitted if
validation fails. All files are checked and failures are reported together in a
GitHub error annotation. Use a workflow matrix for per-document jobs.

## Runner and security requirements

The action sets up Node `26.1.0`, and source mode also sets up pnpm `11.1.3`.
These tools remain available to subsequent job steps. Self-hosted runners need
support for Node 24 based setup actions, Git, Bash, and access to GitHub and npm.
No token or write permissions are needed. Installation uses an isolated temporary
directory, disables dependency lifecycle scripts, and is cleaned up after use.
Source mode intentionally runs the selected validator's build script; only choose
trusted clidoc commits. File contents are parsed as data, never imported as code.
Inputs are passed through environment variables and separate process arguments.
Network access is used for installation; document validation itself is offline.

[Official documentation](https://clidoc-l5su5qyryq-uc.a.run.app/docs/guides/github-action/) ·
[Contributing and releases](CONTRIBUTING.md) · [MIT license](LICENSE)
