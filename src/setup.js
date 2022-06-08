const core = require('@actions/core');

const path = require('path');
const fs = require('fs');
const semver = require('semver');

const {
  getFileFromGitHubRepository,
  getAssetFromGithubRelease,
} = require('./github-functions');

/**
 * Creates the context object needed for the rest of the steps
 *
 * @param {Object} context - The github context object for the release
 * @param {Boolean} config.update_metadata_files - Whether or not to update the metadata files
 * @param {Boolean} config.codemeta_json - Whether or not to download the codemeta.json file
 * @param {Boolean} config.citation_cff - Whether or not to download the CITATION.cff file
 * @param {Boolean} config.zenodo_json - Whether or not to download the .zenodo.json file
 * @param {String} config.committer_name - The name of a custom committer
 * @param {String} config.committer_email - The email of a custom committer
 * @param {String} config.commit_message - The commit message for the upload
 * @param {String} config.zenodo_deposition_id - The Zenodo deposition ID
 * @param {String} config.zenodo_sandbox - Whether or not to upload to the Zenodo sandbox
 *
 * @returns {Object} - The context object required for the action
 */
const createContextObject = async (
  context,
  update_metadata_files,
  codemeta_json,
  citation_cff,
  zenodo_json,
  committer_name,
  committer_email,
  commit_message,
  zenodo_deposition_id,
  zenodo_sandbox,
) => {
  const payload = context.payload;
  let context_object = {};

  if ('repository' in payload) {
    if ('full_name' in payload.repository) {
      context_object.repository = payload.repository.full_name;
    } else {
      core.setFailed('The payload does not contain a repository full name');
      process.exit(1);
    }

    if ('default_branch' in payload.repository) {
      context_object.default_branch = payload.repository.default_branch;
    } else {
      core.setFailed('The payload does not contain a default branch');
      process.exit(1);
    }
  } else {
    core.setFailed('The payload does not contain a repository object');
    process.exit(1);
  }

  if ('release' in payload) {
    if ('assets' in payload.release) {
      context_object.assets = payload.release.assets;
    } else {
      core.setFailed('The payload does not contain release assets');
      process.exit(1);
    }

    if ('tag_name' in payload.release) {
      let tag_name = payload.release.tag_name;
      let clean_tag_name;

      if (semver.valid(tag_name)) {
        clean_tag_name = semver.clean(tag_name, { loose: true });
      } else {
        try {
          clean_tag_name = semver.coerce(tag_name);
        } catch (error) {
          core.error(
            `The tag name ${tag_name} is not a valid semver. Reverting to the original tag name. ${error.message}`,
          );
          clean_tag_name = tag_name;
        }
      }

      context_object.tag_name = clean_tag_name;
    } else {
      core.setFailed('The payload does not contain a tag name');
      process.exit(1);
    }
  } else {
    core.setFailed('The payload does not contain a release');
    process.exit(1);
  }

  context_object.update_metadata_files = update_metadata_files;

  context_object.codemeta_json = codemeta_json;
  context_object.citation_cff = citation_cff;
  context_object.zenodo_json = zenodo_json;

  context_object.custom_committer = false;
  context_object.committer_name = committer_name;
  context_object.committer_email = committer_email;
  context_object.commit_message = commit_message;

  if (committer_name !== '') {
    context_object.custom_committer = true;
  }

  if (committer_email !== '') {
    context_object.custom_committer = true;
  }

  if (commit_message !== 'chore: update <file-name> for Zenodo release') {
    context_object.custom_committer = true;
  }

  context_object.original_zenodo_deposition_id = zenodo_deposition_id;

  if (zenodo_sandbox) {
    context_object.zenodo_url = 'https://sandbox.zenodo.org';
  } else {
    context_object.zenodo_url = 'https://zenodo.org';
  }

  return context_object;
};

/**
 * Creates the subfolders needed for the action
 *
 * @returns {Object} {metadataFolderPath, releaseAssetsFolderPath} - The paths to the metadata and release assets folders
 */
const setupFolderEnvironment = async () => {
  const rootPath = process.cwd();

  const metadataFolderPath = path.join(rootPath, 'metadata'); // folder to hold the metadata files needed for the action.
  const releaseAssetsFolderPath = path.join(rootPath, 'release-assets'); // folder to hold the release assets

  try {
    if (!fs.existsSync(metadataFolderPath)) {
      fs.mkdirSync(metadataFolderPath);
    }
  } catch (error) {
    core.setFailed(
      `The metadata folder could not be created. ${error.message}`,
    );
    process.exit(1);
  }

  try {
    if (!fs.existsSync(releaseAssetsFolderPath)) {
      fs.mkdirSync(releaseAssetsFolderPath);
    }
  } catch (error) {
    core.setFailed(
      `The release assets folder could not be created. ${error.message}`,
    );
    process.exit(1);
  }

  const responseObject = {
    metadataFolderPath,
    releaseAssetsFolderPath,
  };

  return responseObject;
};

/**
 * Download the metadata files from the GitHub repository
 * Currently will download the codemeta.json, CITATION.cff and .zenodo.json files
 *
 * @param {Object} config - The configuration object
 * @param {String} github_token - The GitHub token
 * @param {String} _metadata_folder_path - The path to the metadata folder
 *
 * @returns {Promise} - The promise for the download
 */
const downloadMetadataFiles = async (
  config,
  github_token,
  metadata_folder_path,
) => {
  let required_files = [];

  if (config.codemeta_json) {
    required_files.push('codemeta.json');
  }

  if (config.citation_cff) {
    required_files.push('CITATION.cff');
  }

  if (config.zenodo_json) {
    required_files.push('.zenodo.json');
  }

  for (const file of required_files) {
    const file_path = path.join(metadata_folder_path, file);

    try {
      await getFileFromGitHubRepository(
        github_token,
        config.repository,
        file,
        file_path,
      );
    } catch (error) {
      core.setFailed(
        `The ${file} file could not be downloaded. ${error.message}`,
      );
      process.exit(1);
    }
  }

  return Promise.resolve();
};

/**
 * Creates the context object and downloads the metadata files from the GitHub repository
 *
 * @param {String} config
 * @param {String} release_assets_folder_path
 *
 * @returns {Promise} - The promise for the download
 */
const downloadReleaseAssests = async (config, release_assets_folder_path) => {
  const release_assets = config.assets;

  for (const asset of release_assets) {
    const file_path = path.join(release_assets_folder_path, asset.name);

    try {
      const url = asset.browser_download_url;

      core.info(`Downloading ${url} to ${file_path}`);

      await getAssetFromGithubRelease(url, asset.name, file_path);
    } catch (error) {
      core.setFailed(
        `The ${asset.name} file could not be downloaded. ${error.message}`,
      );
      process.exit(1);
    }
  }
};

module.exports = {
  setupFolderEnvironment,
  createContextObject,
  downloadMetadataFiles,
  downloadReleaseAssests,
};
