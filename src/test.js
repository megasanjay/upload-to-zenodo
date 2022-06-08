require('dotenv').config();
const core = require('@actions/core');

const path = require('path');
const fs = require('fs');

const {
  setupFolderEnvironment,
  createContextObject,
  downloadMetadataFiles,
  downloadReleaseAssests,
} = require('./setup');

const {
  updateMetadataFiles,
  uploadMetadataFilesToGitHub,
} = require('./metadata');

const {
  createNewZenodoDepositionVersion,
  getZenodoDeposition,
  uploadFileToZenodo,
  updateZenodoMetata,
  // publishZenodoDeposition,
  removeFileFromZenodoDeposition,
} = require('./zenodo');

const { getGithubRepoZipball } = require('./github-functions');

const main = async () => {
  // delete folder
  let folder_path = path.join(process.cwd(), 'metadata');
  if (fs.existsSync(folder_path)) {
    fs.rmdirSync(folder_path, { recursive: true });
  }

  folder_path = path.join(process.cwd(), 'release-assets');
  if (fs.existsSync(folder_path)) {
    fs.rmdirSync(folder_path, { recursive: true });
  }

  try {
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    if (!GITHUB_TOKEN) {
      core.setFailed('The github_token input is required');
      return;
    }

    const ZENODO_TOKEN = process.env.ZENODO_TOKEN;
    if (!ZENODO_TOKEN) {
      core.setFailed('The zenodo_token input is required');
      return;
    }

    const ZENODO_DEPOSITION_ID = 6622359;
    if (!ZENODO_DEPOSITION_ID) {
      core.setFailed('The zenodo_deposition_id is not set');
      return;
    }

    const GITHUB_CONTEXT = {
      payload: {
        repository: {
          full_name: 'megasanjay/psychic-broccoli',
          default_branch: 'main',
        },
        release: {
          assets: [
            {
              url: 'https://api.github.com/repos/megasanjay/psychic-broccoli/releases/assets/67663812',
              id: 67663812,
              node_id: 'RA_kwDOHdKUq84ECHfE',
              name: 'latest-mac.yml',
              label: null,
              uploader: {
                login: 'megasanjay',
                id: 21206996,
                node_id: 'MDQ6VXNlcjIxMjA2OTk2',
                avatar_url:
                  'https://avatars.githubusercontent.com/u/21206996?v=4',
                gravatar_id: '',
                url: 'https://api.github.com/users/megasanjay',
                html_url: 'https://github.com/megasanjay',
                followers_url:
                  'https://api.github.com/users/megasanjay/followers',
                following_url:
                  'https://api.github.com/users/megasanjay/following{/other_user}',
                gists_url:
                  'https://api.github.com/users/megasanjay/gists{/gist_id}',
                starred_url:
                  'https://api.github.com/users/megasanjay/starred{/owner}{/repo}',
                subscriptions_url:
                  'https://api.github.com/users/megasanjay/subscriptions',
                organizations_url:
                  'https://api.github.com/users/megasanjay/orgs',
                repos_url: 'https://api.github.com/users/megasanjay/repos',
                events_url:
                  'https://api.github.com/users/megasanjay/events{/privacy}',
                received_events_url:
                  'https://api.github.com/users/megasanjay/received_events',
                type: 'User',
                site_admin: false,
              },
              content_type: 'application/octet-stream',
              state: 'uploaded',
              size: 533,
              download_count: 0,
              created_at: '2022-06-06T07:54:18Z',
              updated_at: '2022-06-06T07:54:18Z',
              browser_download_url:
                'https://github.com/megasanjay/psychic-broccoli/releases/download/v1.0.2/latest-mac.yml',
            },
            {
              url: 'https://api.github.com/repos/megasanjay/psychic-broccoli/releases/assets/67663714',
              id: 67663714,
              node_id: 'RA_kwDOHdKUq84ECHdi',
              name: 'SODA-for-SPARC-5.4.1-mac.zip',
              label: null,
              uploader: {
                login: 'megasanjay',
                id: 21206996,
                node_id: 'MDQ6VXNlcjIxMjA2OTk2',
                avatar_url:
                  'https://avatars.githubusercontent.com/u/21206996?v=4',
                gravatar_id: '',
                url: 'https://api.github.com/users/megasanjay',
                html_url: 'https://github.com/megasanjay',
                followers_url:
                  'https://api.github.com/users/megasanjay/followers',
                following_url:
                  'https://api.github.com/users/megasanjay/following{/other_user}',
                gists_url:
                  'https://api.github.com/users/megasanjay/gists{/gist_id}',
                starred_url:
                  'https://api.github.com/users/megasanjay/starred{/owner}{/repo}',
                subscriptions_url:
                  'https://api.github.com/users/megasanjay/subscriptions',
                organizations_url:
                  'https://api.github.com/users/megasanjay/orgs',
                repos_url: 'https://api.github.com/users/megasanjay/repos',
                events_url:
                  'https://api.github.com/users/megasanjay/events{/privacy}',
                received_events_url:
                  'https://api.github.com/users/megasanjay/received_events',
                type: 'User',
                site_admin: false,
              },
              content_type: 'application/x-zip-compressed',
              state: 'uploaded',
              size: 161810189,
              download_count: 0,
              created_at: '2022-06-06T07:52:21Z',
              updated_at: '2022-06-06T07:54:18Z',
              browser_download_url:
                'https://github.com/megasanjay/psychic-broccoli/releases/download/v1.0.2/SODA-for-SPARC-5.4.1-mac.zip',
            },
            {
              url: 'https://api.github.com/repos/megasanjay/psychic-broccoli/releases/assets/67663539',
              id: 67663539,
              node_id: 'RA_kwDOHdKUq84ECHaz',
              name: 'SODA-for-SPARC-5.4.1.dmg',
              label: null,
              uploader: {
                login: 'megasanjay',
                id: 21206996,
                node_id: 'MDQ6VXNlcjIxMjA2OTk2',
                avatar_url:
                  'https://avatars.githubusercontent.com/u/21206996?v=4',
                gravatar_id: '',
                url: 'https://api.github.com/users/megasanjay',
                html_url: 'https://github.com/megasanjay',
                followers_url:
                  'https://api.github.com/users/megasanjay/followers',
                following_url:
                  'https://api.github.com/users/megasanjay/following{/other_user}',
                gists_url:
                  'https://api.github.com/users/megasanjay/gists{/gist_id}',
                starred_url:
                  'https://api.github.com/users/megasanjay/starred{/owner}{/repo}',
                subscriptions_url:
                  'https://api.github.com/users/megasanjay/subscriptions',
                organizations_url:
                  'https://api.github.com/users/megasanjay/orgs',
                repos_url: 'https://api.github.com/users/megasanjay/repos',
                events_url:
                  'https://api.github.com/users/megasanjay/events{/privacy}',
                received_events_url:
                  'https://api.github.com/users/megasanjay/received_events',
                type: 'User',
                site_admin: false,
              },
              content_type: 'application/octet-stream',
              state: 'uploaded',
              size: 165940523,
              download_count: 0,
              created_at: '2022-06-06T07:50:22Z',
              updated_at: '2022-06-06T07:52:20Z',
              browser_download_url:
                'https://github.com/megasanjay/psychic-broccoli/releases/download/v1.0.2/SODA-for-SPARC-5.4.1.dmg',
            },
            {
              url: 'https://api.github.com/repos/megasanjay/psychic-broccoli/releases/assets/67663711',
              id: 67663711,
              node_id: 'RA_kwDOHdKUq84ECHdf',
              name: 'SODA-for-SPARC-5.4.1.dmg.blockmap',
              label: null,
              uploader: {
                login: 'megasanjay',
                id: 21206996,
                node_id: 'MDQ6VXNlcjIxMjA2OTk2',
                avatar_url:
                  'https://avatars.githubusercontent.com/u/21206996?v=4',
                gravatar_id: '',
                url: 'https://api.github.com/users/megasanjay',
                html_url: 'https://github.com/megasanjay',
                followers_url:
                  'https://api.github.com/users/megasanjay/followers',
                following_url:
                  'https://api.github.com/users/megasanjay/following{/other_user}',
                gists_url:
                  'https://api.github.com/users/megasanjay/gists{/gist_id}',
                starred_url:
                  'https://api.github.com/users/megasanjay/starred{/owner}{/repo}',
                subscriptions_url:
                  'https://api.github.com/users/megasanjay/subscriptions',
                organizations_url:
                  'https://api.github.com/users/megasanjay/orgs',
                repos_url: 'https://api.github.com/users/megasanjay/repos',
                events_url:
                  'https://api.github.com/users/megasanjay/events{/privacy}',
                received_events_url:
                  'https://api.github.com/users/megasanjay/received_events',
                type: 'User',
                site_admin: false,
              },
              content_type: 'application/octet-stream',
              state: 'uploaded',
              size: 175804,
              download_count: 0,
              created_at: '2022-06-06T07:52:20Z',
              updated_at: '2022-06-06T07:52:21Z',
              browser_download_url:
                'https://github.com/megasanjay/psychic-broccoli/releases/download/v1.0.2/SODA-for-SPARC-5.4.1.dmg.blockmap',
            },
          ],
          tag_name: 'v1.0.2',
        },
      },
    };

    const COMMITER_NAME = '';
    const COMMITER_EMAIL = '';
    const COMMIT_MESSAGE = 'chore: update ${file_name} for Zenodo release';

    const UPDATE_METADATA_FILES = true;
    const CODEMETA_JSON = true;
    const CITATION_CFF = true;
    const ZENODO_JSON = true;

    const ZENODO_SANDBOX = false;

    const context_object = await createContextObject(
      GITHUB_CONTEXT,
      UPDATE_METADATA_FILES,
      CODEMETA_JSON,
      CITATION_CFF,
      ZENODO_JSON,
      COMMITER_NAME,
      COMMITER_EMAIL,
      COMMIT_MESSAGE,
      ZENODO_DEPOSITION_ID,
      ZENODO_SANDBOX,
    );

    // create the subfolders for the metadata files and the release assets
    const { metadataFolderPath, releaseAssetsFolderPath } =
      await setupFolderEnvironment();

    // download the metadata files
    await downloadMetadataFiles(
      context_object,
      GITHUB_TOKEN,
      metadataFolderPath,
    );

    // download the release assets
    await downloadReleaseAssests(context_object, releaseAssetsFolderPath);

    // create a new version of the dataset on Zenodo
    // const deposition_id = 6617774;
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
    // context_object.doi = '10.5072/zenodo.6617774';

    // const bucket_url =
    // 'https://zenodo.org/api/files/c91318f4-b9f3-4e3f-a1ac-35d4a2323753';
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
       * Currently this will be changing the following fiels:
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
      );
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

      core.info(`Uploading file ${file} to Zenodo`);

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

      await updateZenodoMetata(
        context_object,
        deposition_id,
        file_path,
        ZENODO_TOKEN,
      );
    }

    // publish the Zenodo deposition
    // await publishZenodoDeposition(context_object, deposition_id, ZENODO_TOKEN);

    /**
     * TODO: Update the README with the new badge
     * TODO: Figure out where to setup the mapping for the versions
     */
  } catch (error) {
    core.setFailed(error.message);
  }
};

main();

// const axios = require('axios');

// const getGithubRepoZipball2 = async (_config, release_assets_folder_path) => {
//   const full_name = 'megasanjay/psychic-broccoli';
//   const repo = full_name.split('/')[1];
//   const version = '5.4.1';

//   const zip_file_name = `${repo}-${version}.zip`;
//   const zip_file_path = path.join(release_assets_folder_path, zip_file_name);

//   core.info(`Downloading ${repo} ${version} to ${zip_file_path}`);

//   try {
//     const url = `https://api.github.com/repos/${full_name}/zipball/main`;
//     // const url = `https://api.github.com/repos/${full_name}/tarball/main`;

//     console.log(url);

//     const response = await axios({
//       method: 'get',
//       url,
//       responseType: 'stream',
//       timeout: 150e3,
//     });

//     console.log(response.status);

//     if (response.status === 200) {
//       const file_content = response.data;

//       // console.log(file_content);

//       core.info(`Writing ${zip_file_name} to ${zip_file_path}`);

//       // fs.createWriteStream(zip_file_path, file_content, 'utf8');
//       await new Promise((resolve, reject) => {
//         const outStream = fs.createWriteStream(zip_file_path);
//         file_content.pipe(outStream);
//         outStream.on('finish', () => {
//           console.log('The file has been written');
//           resolve();
//         });
//         outStream.on('error', (err) => {
//           console.log(err);
//           reject(err);
//         });
//       });

//       core.info(`Downloaded and wrote source code to ${zip_file_path}`);

//       return Promise.resolve();
//     }
//   } catch (error) {
//     Promise.reject(error);
//     process.exit(1);
//   }
// };

// getGithubRepoZipball2(
//   'megasanjay/psychic-broccoli',
//   path.join(process.cwd(), 'release-assets'),
// );

// const mime = require('mime-types');

// const uploadFileToZenodo2 = async (
//   // context,
//   // deposition_id,
//   access_token,
//   bucket_url,
//   file_name,
//   file_path,
// ) => {
//   try {
//     // read the contents of the file at file_path into a buffer
//     const file_content = fs.createReadStream(file_path);

//     core.info(`Uploading file ${file_name} at ${file_path} to Zenodo`);

//     const url = `${bucket_url}/${file_name}`;

//     let content_type = mime.contentType(file_name)
//       ? mime.contentType(file_name)
//       : 'text/plain';

//     if (content_type.includes('application/json')) {
//       // zenodo declines json uploads with a 400 - BAD REQUEST,
//       // avoiding error by setting content type to plain text
//       // This one comes from: https://github.com/zenodraft/zenodraft/blob/main/src/lib/file/add.ts#L15-L18
//       content_type = 'text/plain';
//     }

//     let content_length = fs.statSync(file_path).size.toString();

//     const headers = {
//       Authorization: `Bearer  ${access_token}`,
//       'Content-Type': content_type,
//       'Content-Length': content_length,
//     };

//     var config = {
//       method: 'put',
//       url,
//       headers,
//       data: file_content,
//     };

//     console.log(url);

//     const response = await axios(config)
//       .then(function (response) {
//         console.log(response.status);
//         return response.data;
//       })
//       .catch(function (error) {
//         console.log(error);
//         core.error('error with zenodo upload');
//         return 'ERROR';
//       });

//     if (response === 'ERROR') {
//       core.setFailed(`Could not upload file to Zenodo.`);
//       throw new Error('Could not upload file to Zenodo.');
//     } else {
//       core.info(`Uploaded file ${file_name} to Zenodo`);
//       return Promise.resolve();
//     }
//   } catch (error) {
//     core.setFailed(`Could not upload file to Zenodo. ${error}`);
//     // await deleteZenodoDeposition(context, deposition_id, access_token);
//     process.exit(1);
//   }
// };

// // uploadFileToZenodo2(
// //   process.env.ZENODO_TOKEN,
// //   'https://zenodo.org/api/files/c91318f4-b9f3-4e3f-a1ac-35d4a2323753',
// //   'latest-mac.yml',
// //   path.join(process.cwd(), 'release-assets', 'latest-mac.yml'),
// // );
