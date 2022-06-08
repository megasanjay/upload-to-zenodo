const core = require('@actions/core');

const fs = require('fs');
const axios = require('axios');
const mime = require('mime-types');

/**
 * Create a new version of a deposition in Zenodo
 *
 * @param {Object} context - The context object
 * @param {String} access_token - The access token to use for the zendodo API
 *
 * @returns {String} - The  Zenodo deposition ID and the Zenodo token
 */
const createNewZenodoDepositionVersion = async (context, access_token) => {
  const deposition_id = context.original_zenodo_deposition_id;

  const url = `${context.zenodo_url}/api/deposit/depositions/${deposition_id}/actions/newversion`;

  core.info(url);

  try {
    const config = {
      method: 'post',
      url,
      headers: {
        Authorization: `token ${access_token}`,
      },
    };

    const response = await axios(config);

    if (response.status === 201) {
      const links = response.data.links;
      const latest_draft_url = links.latest_draft;

      const last_slash = latest_draft_url.lastIndexOf('/');

      const new_deposition_id = latest_draft_url.substring(last_slash + 1);

      core.info(`Created new Zenodo deposition ${new_deposition_id}`);

      return new_deposition_id;
    } else {
      core.setFailed(
        `Could not create new Zenodo deposition version. ${response.data}`,
      );
      process.exit(1);
    }
  } catch (error) {
    core.setFailed(`Could not create new Zenodo deposition version. ${error}`);
    process.exit(1);
  }
};

/**
 * Get a zenodo deposition's data
 *
 * @param {Object} context - The context object
 * @param {String} deposition_id - The Zenodo deposition ID
 * @param {String} access_token - The access token to use for the zendodo API
 *
 * @returns {Object} - The Zenodo deposition data
 */
const getZenodoDeposition = async (context, deposition_id, access_token) => {
  try {
    const url = `${context.zenodo_url}/api/deposit/depositions/${deposition_id}?access_token=${access_token}`;

    const response = await axios.get(url);

    if (response.status === 200) {
      core.info(`Got Zenodo deposition ${deposition_id}`);

      return response.data;
    } else {
      core.setFailed(`Could not get Zenodo deposition. ${response.data}`);
      process.exit(1);
    }
  } catch (error) {
    core.setFailed(`Could not get Zenodo deposition. ${error.message}`);
    process.exit(1);
  }
};

/**
 * Delete a zenodo deposition.
 * Mainly used to clean up after a failed upload to Zenodo.
 *
 * @param {Object} context
 * @param {String} deposition_id
 * @param {String} access_token
 *
 * @returns {Promise} - A promise that resolves when the deposition is deleted
 */
const deleteZenodoDeposition = async (context, deposition_id, access_token) => {
  try {
    core.info(`Deleting Zenodo deposition ${deposition_id}`);
    const url = `${context.zenodo_url}/api/deposit/depositions/${deposition_id}?access_token=${access_token}`;

    const response = await axios.delete(url);

    if (response.status === 204) {
      return Promise.resolve();
    } else {
      core.setFailed(
        `Could not delete draft Zenodo deposition. ${response.data}`,
      );
      process.exit(1);
    }
  } catch (error) {
    core.setFailed(
      `Could not delete draft Zenodo deposition. ${error.message}`,
    );
    process.exit(1);
  }
};

/**
 * Upload a file to a Zenodo deposition
 *
 * @param {Object} context - The context object
 * @param {String} deposition_id - The Zenodo deposition ID
 * @param {String} access_token - The access token to use for the zendodo API
 * @param {String} bucket_url - The URL of the bucket to upload the file to
 * @param {String} file_name - The name of the file to upload
 * @param {String} file_path - The path to the file to upload
 *
 * @returns {Promise} - A promise that resolves when the file is uploaded
 */
const uploadFileToZenodo = async (
  context,
  deposition_id,
  access_token,
  bucket_url,
  file_name,
  file_path,
) => {
  try {
    // read the contents of the file at file_path into a buffer
    const file_content = fs.createReadStream(file_path);

    core.info(`File name: ${file_name}`);
    core.info(`File path: ${file_path}`);

    const url = `${bucket_url}/${file_name}`;

    let content_type = mime.contentType(file_name)
      ? mime.contentType(file_name)
      : 'text/plain';

    if (content_type.includes('application/json')) {
      /**
       * zenodo declines json uploads with a 400 - BAD REQUEST,
       * avoiding error by setting content type to plain text
       *
       * @see https://github.com/zenodraft/zenodraft/blob/main/src/lib/file/add.ts#L15-L18
       * */
      content_type = 'text/plain';
    }

    let content_length = fs.statSync(file_path).size.toString();

    const headers = {
      Authorization: `token  ${access_token}`,
      'Content-Type': content_type,
      'Content-Length': content_length,
    };

    const config = {
      method: 'put',
      url,
      headers,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      data: file_content,
    };

    core.info(`Uploading file ${file_name} to ${url}`);

    const response = await axios(config)
      .then(function (response) {
        return response.data;
      })
      .catch(function (error) {
        try {
          core.error(
            `Error with zenodo upload: ${error.response.data.message}`,
          );
        } catch (e) {
          //do nothing
        }
        return 'ERROR';
      });

    if (response === 'ERROR') {
      core.setFailed(`Could not upload file to Zenodo.`);
      throw new Error('');
    } else {
      core.info(`Uploaded file ${file_name} to Zenodo`);
      return Promise.resolve();
    }
  } catch (error) {
    core.setFailed(`Could not upload file to Zenodo. ${error}`);
    await deleteZenodoDeposition(context, deposition_id, access_token);
    process.exit(1);
  }
};

/**
 * Remove a file from a Zenodo deposition. Used for draft
 *
 * @param {Object} context - The context object
 * @param {String} deposition_id - The Zenodo deposition ID
 * @param {String} file_id - The Zenodo file ID
 * @param {String} access_token - The access token to use for the zendodo API
 *
 * @returns {Promise} - A promise that resolves when the file is removed
 */
const removeFileFromZenodoDeposition = async (
  context,
  deposition_id,
  file_id,
  access_token,
) => {
  try {
    const url = `${context.zenodo_url}/api/deposit/depositions/${deposition_id}/files/${file_id}?access_token=${access_token}`;

    const response = await axios.delete(url);

    if (response.status === 204) {
      return Promise.resolve();
    } else {
      core.error(
        `Could not delete file from Zenodo deposition. ${response.data}`,
      );
      return;
    }
  } catch (error) {
    await deleteZenodoDeposition(context, deposition_id, access_token);
    core.setFailed(
      `Could not delete file from Zenodo deposition. ${error.message}`,
    );
    process.exit(1);
  }
};

/**
 * Add the updated metadata to the deposition
 *
 * @param {Object} context - The context object
 * @param {String} deposition_id - The Zenodo deposition ID
 * @param {String} metadata_file_path - The path to the metadata file
 * @param {String} access_token - The access token to use for the zendodo API
 *
 * @returns {Promise} - A promise that resolves when the metadata is added
 */
const updateZenodoMetata = async (
  context,
  deposition_id,
  metadata_file_path,
  access_token,
) => {
  try {
    const url = `${context.zenodo_url}/api/deposit/depositions/${deposition_id}`;

    core.info(`Updating Zenodo metadata`);

    let metadata = JSON.parse(fs.readFileSync(metadata_file_path, 'utf8'));
    metadata = JSON.stringify({ metadata });

    const headers = {
      Authorization: `token  ${access_token}`,
      'Content-Type': 'application/json',
    };

    const config = {
      method: 'put',
      url,
      headers,
      data: metadata,
    };

    const response = await axios(config)
      .then(function (response) {
        return response.data;
      })
      .catch(function (error) {
        try {
          console.log(error.response.data.errors);
          core.error(
            `error with zenodo metadata update: ${error.response.data.message}`,
          );
        } catch (e) {
          //do nothing
        }
        return 'ERROR';
      });

    if (response === 'ERROR') {
      core.setFailed(`Could not update Zenodo metadata.`);
      throw new Error('');
    } else {
      core.info(`Updated Zenodo metadata`);
      return Promise.resolve();
    }
  } catch (error) {
    await deleteZenodoDeposition(context, deposition_id, access_token);
    core.setFailed(`Could not update Zenodo metadata. ${error.message}`);
    process.exit(1);
  }
};

/**
 * Publish a Zenodo deposition
 *
 * @param {Object} context - The context object
 * @param {String} deposition_id - The Zenodo deposition ID
 * @param {String} access_token - The access token to use for the zendodo API
 *
 * @returns {Promise} - A promise that resolves when the deposition is published
 */
const publishZenodoDeposition = async (
  context,
  deposition_id,
  access_token,
) => {
  try {
    const url = `${context.zenodo_url}/api/deposit/depositions/${deposition_id}/actions/publish?access_token=${access_token}`;

    const response = await axios.post(url);

    if (response.status === 200) {
      core.info(`Published Zenodo deposition`);

      return Promise.resolve();
    } else {
      await deleteZenodoDeposition(context, deposition_id, access_token);
      core.setFailed(`Could not publish Zenodo deposition. ${response.data}`);
      process.exit(1);
    }
  } catch (error) {
    await deleteZenodoDeposition(context, deposition_id, access_token);
    core.setFailed(`Could not publish Zenodo deposition. ${error.message}`);
    process.exit(1);
  }
};

module.exports = {
  createNewZenodoDepositionVersion,
  getZenodoDeposition,
  uploadFileToZenodo,
  deleteZenodoDeposition,
  updateZenodoMetata,
  publishZenodoDeposition,
  removeFileFromZenodoDeposition,
};
