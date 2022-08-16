# Upload a GitHub release to Zenodo

This is a Github action to update your `codemeta.json`, `CITATION.cff` and `.zenodo.json` files with the release information and then upload your release to Zenodo.

This action uses the **tag name** of the release to update the `version` field in the metadata files. Be sure to use the correct tag name. Within your tag name a valid semver version should be present.

When update metadata files are added to your repository, the action will automatically send the new metadata files in its release. This will also mean that your Github release will not contain the updated metadata files. To avoid this, you can set the `update_metadata_files` option to `false` and add a `.zenodo.json` file.

Remember to remove the webhook from your repository before using this action. Otherwise, you will have two releases on Zenodo for every release on Github.

Currently the following files and fields will be updated:

    * `codemeta.json`:
        * `version`: The release version
        * `identifier`: The release identifier (Zenodo version specific doi)

    * `CITATION.cff`:
        * `version`: The release version
        * `identifiers`: The release identifier (Zenodo version specific doi).
        This action currently assumes your old zenodo doi is the first item in the list.

    * `.zenodo.json`:
        * `version`: The release version

## Inputs

A list of all inputs to the action is as follows:

`github_token` - **Required** - The GitHub token used to authenticate with GitHub. If not present, the action will attempt to read the token from the `GITHUB_TOKEN` environment variable.

`zenodo_token` - **Required** - The Zenodo token used to authenticate with Zenodo.

`zenodo_deposition_id` - **Required** - The Zenodo deposition ID to upload the release to.

`zenodo_publish` - **Optional** - Whether to publish the release. Defaults to `false`.

`zenodo_sandbox` - **Optional** - Whether to use the Zenodo sandbox. Defaults to `false`.

`committer_name` - **Optional** - The name of the committer.

`committer_email` - **Optional** - The email of the committer.

`commit_message` - **Optional** - The commit message. Defaults to `chore: update ${file_name} for Zenodo release`. You can use the `${file_name}` variable to refer to the metdata file name in the commit message.

`update_metadata_files` - **Optional** - Whether to update the metadata files. Defaults to `true`. This will also push the changes to GitHub.

`codemeta_json` - **Optional** - Whether a `codemeta.json` file exists in the repository and needs to be updated for the new release. Defaults to `false`.

`citation_cff` - **Optional** - Whether a `CITATION.cff` file exists in the repository and needs to be updated for the new release. Defaults to `false`.

`zenodo_json` - **Optional** - Whether a `.zenodo.json` file exists in the repository and needs to be updated for the new release. Defaults to `false`.

## Outputs

`doi` - The Zenodo DOI of the release.

`version` - The version of the release.

## Example usage

A sample action is shown below.

```yaml
name: Release on Zenodo

on:
  release:
    types: [published]

jobs:
  upload-to-zenodo:
    runs-on: ubuntu-latest
    name: A job to update metadata and push a release to Zenodo

    steps:
      # This step is not needed at the moment but might decide to add on more steps in the future
      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 16

      - name: Upload to Zenodo
        id: release
        uses: megasanjay/upload-to-zenodo@v1.6.1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          zenodo_token: ${{ secrets.ZENODO_TOKEN }}
          zenodo_deposition_id: SOME_DEPOSITION_ID
          zenodo_publish: true
          zenodo_sandbox: false
          commit_message: 'chore: update ${file_name} for Zenodo release'
          update_metadata_files: true
          codemeta_json: true
          citation_cff: true
          zenodo_json: true

      # Get the doi from the `release` step
      - name: Get the output doi
        run: echo "The released doi was ${{ steps.release.outputs.doi }}"
```

## Build and release instructions

To build and release a new version of the action, run the following commands:

```sh
npm install
npm run build

git commit -a -m "chore: release action v1.2.3"
git tag -a -m "Action v1.2.3 release" v1.2.3
git push --follow-tags
```
