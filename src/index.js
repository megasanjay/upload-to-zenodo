const core = require('@actions/core');
const github = require('@actions/github');

const path = require('path');
const fs = require('fs');

const {
  setupFolderEnvironment,
  createContextObject,
  downloadMetadataFiles,
  downloadReleaseAssets,
} = require('./setup');

const {
  updateMetadataFiles,
  uploadMetadataFilesToGitHub,
} = require('./metadata');

const {
  createNewZenodoDepositionVersion,
  getZenodoDeposition,
  uploadFileToZenodo,
  updateZenodoMetadata,
  publishZenodoDeposition,
  removeFileFromZenodoDeposition,
} = require('./zenodo');

const { getGithubRepoZipball } = require('./github-functions');

const main = async () => {
  try {
    const GITHUB_TOKEN = core.getInput('github_token');
    if (!GITHUB_TOKEN) {
      core.setFailed('The github_token input is required');
      return;
    }

    const ZENODO_TOKEN = core.getInput('zenodo_token');
    if (!ZENODO_TOKEN) {
      core.setFailed('The zenodo_token input is required');
      return;
    }

    const ZENODO_DEPOSITION_ID = core.getInput('zenodo_deposition_id');
    if (!ZENODO_DEPOSITION_ID) {
      core.setFailed('The zenodo_deposition_id is not set');
      return;
    }

    const GITHUB_CONTEXT = github.context;

    const COMMITTER_NAME = core.getInput('committer_name');
    const COMMITTER_EMAIL = core.getInput('committer_email');
    const COMMIT_MESSAGE = core.getInput('commit_message');

    const UPDATE_METADATA_FILES =
      core.getInput('update_metadata_files') === 'true';

    const CODEMETA_JSON = core.getInput('codemeta_json') === 'true';
    const CITATION_CFF = core.getInput('citation_cff') === 'true';
    const ZENODO_JSON = core.getInput('zenodo_json') === 'true';
    const DOCS_COMPATIBILITY_JSON =
      core.getInput('docs_compatibility_json') === 'true';

    const ZENODO_SANDBOX = core.getInput('zenodo_sandbox') === 'true';

    const ZENODO_PUBLISH = core.getInput('zenodo_publish') === 'true';

    const context_object = await createContextObject(
      GITHUB_CONTEXT,
      UPDATE_METADATA_FILES,
      CODEMETA_JSON,
      CITATION_CFF,
      ZENODO_JSON,
      DOCS_COMPATIBILITY_JSON,
      COMMITTER_NAME,
      COMMITTER_EMAIL,
      COMMIT_MESSAGE,
      ZENODO_DEPOSITION_ID,
      ZENODO_SANDBOX,
    );

    // create the subfolders for the metadata files and the release assets
    const responseObject = await setupFolderEnvironment();
    const metadataFolderPath = responseObject.metadataFolderPath;
    const releaseAssetsFolderPath = responseObject.releaseAssetsFolderPath;

    // download the metadata files
    await downloadMetadataFiles(
      context_object,
      GITHUB_TOKEN,
      metadataFolderPath,
    );

    // download the release assets
    await downloadReleaseAssets(context_object, releaseAssetsFolderPath);

    // create a new version of the dataset on Zenodo
    const deposition_id = await createNewZenodoDepositionVersion(
      context_object,
      ZENODO_TOKEN,
    );

    // Get the deposition object for the draft on Zenodo
    const deposition = await getZenodoDeposition(
      context_object,
      deposition_id,
      ZENODO_TOKEN,
    );

    // Saving this in here to replace the doi in the metadata files
    context_object.doi = deposition.doi_url;

    const bucket_url = deposition.links.bucket;
    const files = deposition.files;

    // Delete all previous files from the draft
    for (const file of files) {
      const file_id = file.id;
      const file_name = file.filename;

      core.info(`Removing file ${file_name} from Zenodo draft deposition`);

      await removeFileFromZenodoDeposition(
        context_object,
        deposition_id,
        file_id,
        ZENODO_TOKEN,
      );
    }

    if (UPDATE_METADATA_FILES) {
      /**
       * Update the metadata files for the draft.
       *
       * Currently this will be changing the following fields:
       * - `identifier` and `version` in the codemeta.json file.
       * -`identifier` and `version` in the citation.cff file.
       * * Currently assuming that the zenodo doi is in the first
       * * position of the `identifier` array.
       * - `version` in the .zenodo.json file.
       *
       * */
      await updateMetadataFiles(context_object, metadataFolderPath);

      /**
       * Upload the metadata files to GitHub
       *
       * * Conventional commits will be followed for the commit message.
       * */
      await uploadMetadataFilesToGitHub(
        GITHUB_TOKEN,
        context_object,
        metadataFolderPath,
      ); // upload the metadata files to GitHub
    }

    core.info('Uploaded metadata files to GitHub');

    /**
     * Get the source code zipball from GitHub with the updated metadata files
     *
     * Currently saved in the `releaseAssetsFolderPath` folder.
     * */
    await getGithubRepoZipball(context_object, releaseAssetsFolderPath);

    core.info('Downloaded source code zipball from GitHub');

    // get list of files in the release assets folder
    const files_in_release_assets_folder = fs.readdirSync(
      releaseAssetsFolderPath,
    );

    // upload the files to Zenodo
    for (const file of files_in_release_assets_folder) {
      const file_path = path.join(releaseAssetsFolderPath, file);

      core.info(`Preparing ${file} upload...`);

      await uploadFileToZenodo(
        context_object,
        deposition_id,
        ZENODO_TOKEN,
        bucket_url,
        file,
        file_path,
      );
    }

    // update the Zenodo metadata
    if (ZENODO_JSON) {
      const file_path = path.join(metadataFolderPath, '.zenodo.json');

      await updateZenodoMetadata(
        context_object,
        deposition_id,
        file_path,
        ZENODO_TOKEN,
      );
    }

    // publish the Zenodo deposition
    if (ZENODO_PUBLISH) {
      await publishZenodoDeposition(
        context_object,
        deposition_id,
        ZENODO_TOKEN,
      );
    }

    // set outputs for future actions use
    core.setOutput('doi', context_object.doi);
    core.setOutput('version', context_object.tag_name);

    core.info('Finished!');
    core.info('Version: ' + context_object.tag_name);
    core.info('DOI: ' + context_object.doi);

    /**
     * TODO: Update the README with the new badge
     * TODO: Figure out where to setup the mapping for the versions
     */
  } catch (error) {
    core.setFailed(error.message);
  }
};

main();
