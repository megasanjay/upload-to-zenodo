const axios = require('axios');
const core = require('@actions/core');
const fs = require('fs');
const path = require('path');
const _ = require('lodash');

/**
 * Downloads the metadata files from the GitHub repository
 *
 * @param {String} access_token - The GitHub access token
 * @param {String} repo - The GitHub repository
 * @param {String} file_name - The name of the file to download
 * @param {String} file_path - The location for the file to be saved
 *
 * @returns {Promise} - The promise for the download
 */
const getFileFromGitHubRepository = async (
  access_token,
  repo,
  file_name,
  file_path,
) => {
  try {
    const url = `https://api.github.com/repos/${repo}/contents/${file_name}`;

    const headers = {
      Accept: 'application/vnd.github.v3+json',
      Authorization: `Bearer  ${access_token}`,
    };

    core.info(`Downloading ${file_name} from ${url}`);

    const response = await axios.get(url, { headers });

    core.info(`Writing ${file_name} to ${file_path}`);

    const file_content = Buffer.from(
      response.data.content,
      'base64',
    ).toString();

    fs.writeFileSync(file_path, file_content);

    core.info(`Downloaded and wrote to ${file_path}`);

    return Promise.resolve();
  } catch (error) {
    Promise.reject(error);
  }
};

/**
 * Downloads the release asset from the release
 *
 * @param {String} url - The URL of the release asset
 * @param {String} file_name - The name of the file to download
 * @param {String} file_path - The location for the file to be saved
 *
 * @returns {Promise} - The promise for the download
 */
const getAssetFromGithubRelease = async (url, file_name, file_path) => {
  try {
    const writer = fs.createWriteStream(file_path);

    const response = await axios({
      method: 'GET',
      url,
      responseType: 'stream',
    });

    core.info(`Writing ${file_name} to ${file_path}`);

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
  } catch (error) {
    Promise.reject(error);
  }
};

/**
 * Get the SHA of a file in a GitHub repository
 *
 * @param {String} github_token - The GitHub access token
 * @param {String} repo - The GitHub repository
 * @param {String} file_name - The name of the file to get the SHA of
 *
 * @returns {String} - The SHA of the file
 */
const getFileSHA = async (github_token, repo, file_name) => {
  try {
    const url = `https://api.github.com/repos/${repo}/contents/${file_name}`;

    const headers = {
      Accept: 'application/vnd.github.v3+json',
      Authorization: `Bearer  ${github_token}`,
    };

    let response = await axios.get(url, { headers });

    if (response.status === 200) {
      if (typeof response.data === 'undefined') {
        core.setFailed(`The ${file_name} file could not be found.`);
        process.exit(1);
      }
      if (typeof response.data === 'string') {
        response = JSON.parse(response.data);
      }

      if ('sha' in response.data) {
        return response.data.sha;
      } else {
        return '';
      }
    }
  } catch (error) {
    core.setFailed(`Could not get file SHA. ${error.message}`);
    process.exit(1);
  }
};

/**
 * Upload a file to the GitHub repository
 * @param {String} github_token - The GitHub access token
 * @param {Object} config - The configuration object
 * @param {String} file_name - The name of the file to upload
 * @param {String} file_path - The path to the file to upload
 * @returns {Promise} - The promise for the upload
 */
const uploadFileToGitHub = async (
  github_token,
  config,
  file_name,
  file_path,
) => {
  try {
    let payload;

    const file_content = fs.readFileSync(file_path);

    //encode file content into a base64 string
    const encoded_file_content = Buffer.from(file_content).toString('base64');

    core.info(`Getting the file SHA for ${file_name}`);

    // get the SHA of the file to be replaced
    const file_SHA = await getFileSHA(
      github_token,
      config.repository,
      file_name,
    );

    core.info(`File SHA for ${file_name} is ${file_SHA}`);

    let commit_message = config.commit_message;

    commit_message = _.replace(commit_message, '${file_name}', file_name);

    if (file_SHA === '') {
      payload = {
        message: commit_message,
        content: encoded_file_content,
      };
    } else {
      payload = {
        message: commit_message,
        content: encoded_file_content,
        sha: file_SHA,
      };
    }

    if (config.custom_committer) {
      payload.committer = {
        name: config.committer_name,
        email: config.committer_email,
      };
    }

    const url = `https://api.github.com/repos/${config.repository}/contents/${file_name}`;

    const headers = {
        Accept: 'application/vnd.github.v3+json',
        Authorization: `Bearer  ${github_token}`,
        'Content-Type': 'application/json',
      },
      response = await axios.put(url, payload, { headers });

    if (response.status === 200) {
      core.info(`Uploaded ${file_name} to ${config.repository}`);
    } else {
      core.setFailed(`Could not upload ${file_name} to ${config.repository}`);
      process.exit(1);
    }
  } catch (error) {
    Promise.reject(error);
  }
};

/**
 * Get a zipball of the GitHub repository and save it to the specified location
 * @param {Object} config - The configuration object
 * @param {String} release_assets_folder_path - The path to the folder to save the release assets to
 * @returns {Promise} - The promise for the download
 */
const getGithubRepoZipball = async (config, release_assets_folder_path) => {
  const owner = config.repository.split('/')[0];
  const repo = config.repository.split('/')[1];
  const default_branch = config.default_branch;
  const version = config.tag_name;

  const zip_file_name = `${repo}-${version}.zip`;
  const zip_file_path = path.join(release_assets_folder_path, zip_file_name);

  core.info(`Downloading ${zip_file_name} to ${zip_file_path}`);

  try {
    const url = `https://api.github.com/repos/${owner}/${repo}/zipball/${default_branch}`;

    // Getting back the data as a stream.
    // Seems to be working better this way.
    const response = await axios({
      method: 'get',
      url,
      responseType: 'stream',
      timeout: 150e3,
    });

    if (response.status === 200) {
      const file_content = response.data;

      core.info(`Writing ${zip_file_name} to ${zip_file_path}`);

      await new Promise((resolve, reject) => {
        const outStream = fs.createWriteStream(zip_file_path);

        file_content.pipe(outStream);

        outStream.on('finish', () => {
          console.log('The zipball has been written to disk...');
          resolve();
        });

        outStream.on('error', (err) => {
          console.log('Error writing file', err);
          reject();
        });
      });

      core.info(`Downloaded and wrote source code to ${zip_file_path}`);

      return Promise.resolve();
    }
  } catch (error) {
    Promise.reject(error);
    process.exit(1);
  }
};

module.exports = {
  getFileFromGitHubRepository,
  getAssetFromGithubRelease,
  uploadFileToGitHub,
  getGithubRepoZipball,
};
