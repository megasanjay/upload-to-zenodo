const core = require('@actions/core');

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const dayjs = require('dayjs');

const { uploadFileToGitHub } = require('./github-functions');

/**
 * Updates the JSON file at the given path
 *
 * @param {Object} config - The configuration object
 * @param {String} file_path - The path to the file to update
 * @param {String} file_name - The name of the file to update
 *
 * @returns {Promise} - A promise that resolves if the file was updated
 */
const updateJSON = async (config, file_path, file_name) => {
  try {
    const version = config.tag_name;

    core.info(`Updating ${file_path}`);

    const file_content = await fs.promises.readFile(file_path, 'utf8');
    const json_object = JSON.parse(file_content);

    json_object.version = version;

    if (file_name === 'codemeta.json') {
      json_object.identifier = config.doi;
      json_object.dateModified = dayjs().format('YYYY-MM-DD');
    }

    const updated_file_content = JSON.stringify(json_object, null, 2);

    await fs.promises.writeFile(file_path, updated_file_content, 'utf8');

    core.info(`Updated ${file_path}`);

    return Promise.resolve();
  } catch (error) {
    return Promise.reject(error);
  }
};

/**
 * Updates the YAML file at the given path
 *
 * @param {Object} config - The configuration object
 * @param {String} file_path - The path to the file to update
 *
 * @returns {Promise} - A promise that resolves if the file was updated
 */
const updateYAML = async (config, file_path) => {
  try {
    const version = config.tag_name;

    core.info(`Updating ${file_path}`);

    const file_content = await fs.promises.readFile(file_path, 'utf8');
    const yaml_object = yaml.load(file_content);

    yaml_object.version = version;

    /**
     * This function is currently assuming your zenodo doi
     * is in the first entry of the array.
     *
     * */

    if (!yaml_object.identifiers) {
      yaml_object.identifiers = [
        {
          description: "DOI for this application's record on Zenodo",
          type: 'doi',
          value: config.doi,
        },
      ];
    } else {
      yaml_object.identifiers[0].value = config.doi;
    }

    yaml_object['date-released'] = dayjs().format('YYYY-MM-DD');

    const updated_file_content = yaml.dump(yaml_object);

    await fs.promises.writeFile(file_path, updated_file_content, 'utf8');

    core.info(`Updated ${file_path}`);

    return Promise.resolve();
  } catch (error) {
    return Promise.reject(error);
  }
};

/**
 * Parent function to update the metadata files
 * @param {Object} config
 * @param {String} metadata_folder_path
 *
 * @returns {Promise} - A promise that resolves if the files were updated
 */
const updateMetadataFiles = async (config, metadata_folder_path) => {
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
    let type = 'json';
    const file_path = path.join(metadata_folder_path, file);

    if (file === 'CITATION.cff') {
      type = 'yaml';
    }

    if (type === 'json') {
      try {
        await updateJSON(config, file_path, file);
      } catch (error) {
        core.setFailed(
          `The ${file} file could not be updated. ${error.message}`,
        );
        process.exit(1);
      }
    }

    if (type === 'yaml') {
      try {
        await updateYAML(config, file_path);
      } catch (error) {
        core.setFailed(
          `The ${file} file could not be updated. ${error.message}`,
        );
        process.exit(1);
      }
    }
  }

  return Promise.resolve();
};

/**
 * Upload the metadata files to the GitHub repository
 *
 * @param {String} github_token - The GitHub token
 * @param {Object} config - The configuration object
 * @param {String} metadata_folder_path - The path to the metadata folder
 *
 * @returns {Promise} - A promise that resolves if the files were uploaded
 */
const uploadMetadataFilesToGitHub = async (
  github_token,
  config,
  metadata_folder_path,
) => {
  if (config.codemeta_json) {
    const file_name = 'codemeta.json';
    const file_path = path.join(metadata_folder_path, file_name);

    await uploadFileToGitHub(github_token, config, file_name, file_path);
  }

  if (config.citation_cff) {
    const file_name = 'CITATION.cff';
    const file_path = path.join(metadata_folder_path, file_name);

    await uploadFileToGitHub(github_token, config, file_name, file_path);
  }

  if (config.zenodo_json) {
    const file_name = '.zenodo.json';
    const file_path = path.join(metadata_folder_path, file_name);

    await uploadFileToGitHub(github_token, config, file_name, file_path);
  }

  return Promise.resolve();
};

module.exports = { updateMetadataFiles, uploadMetadataFilesToGitHub };
