/**
 * ***************************
 * *** RUN: npm run deploy ***
 * ***************************
 * This script deploys a mapping file to the Firebase Storage and Firestore.
 * Make sure to store your service account certificate at "/firebase-cert.json".
 *
 * @param mappingFilename The path to the mapping file to deploy
 * @param descriptionFilename The path to the description file
 * @param commitId The commit ID where the file was generated
 * @param category The category in lowercase
 * @param classificationName The classification name
 * @param mappingsLanguage The mappings language (two letters standard)
 */

import admin from 'firebase-admin';
import cert from '../firebase-cert.json';
import chalk from 'chalk';
import path from 'path';
import showdown from 'showdown';
import fs from 'fs';
import zlib from 'zlib';
import ask from './ask';

let fileId: string = '', categoryId: string = '';

(async () => {

  // Relative path validator
  const pathExists = (filename: string) => {

    if ( ! filename || ! fs.existsSync(path.resolve(__dirname, '..', filename)) )
      return new Error('File not found! Please enter a valid path relative to the project root.');

    return true;

  };

  // Yes/no answer validator
  const yesNo = (answer: string) => {

    return ['y', 'yes', 'n', 'no'].includes(answer.trim().toLowerCase());

  };

  // Collect the input parameters
  const mappingFilename = path.resolve(__dirname, '..', await ask('Built mappings filename (relative to root):', true, pathExists));
  const descriptionFilename = path.resolve(__dirname, '..', await ask('Description filename (relative to root):', false, pathExists));
  const commitId = (await ask('Commit ID:', false)).trim();
  const category = (await ask('Category:', false)).trim().toLowerCase();
  const classificationName = (await ask('Classification name:', false)).trim().toLowerCase();
  const mappingsLanguage = (await ask('Mappings language:', false)).trim().toLowerCase();

  console.log('');

  // Double check the input
  console.log(chalk.bold.greenBright('Mappings:               '), mappingFilename);
  if ( descriptionFilename ) console.log(chalk.bold.greenBright('Description:            '), descriptionFilename);
  if ( commitId ) console.log(chalk.bold.greenBright('Commit ID:              '), commitId);
  if ( category ) console.log(chalk.bold.greenBright('Category:               '), category);
  if ( classificationName ) console.log(chalk.bold.greenBright('Classification Name:    '), classificationName);
  if ( mappingsLanguage ) console.log(chalk.bold.greenBright('Mappings Language:      '), mappingsLanguage);

  console.log('');

  if ( ['no', 'n'].includes((await ask('Are you sure you want to deploy? (y/n)', true, yesNo)).trim().toLowerCase()) ) {

    console.log(chalk.bold.red('Aborted!'));
    return;

  }

  try {

    admin.initializeApp({
      credential: admin.credential.cert(<any>cert),
      storageBucket: `gs://${cert.project_id}.appspot.com`
    });

    // Add/update the file document
    let finalVersion: number;
    let deleteOldVersion: boolean = false;

    const fileSnapshot = await admin.firestore().collection('files').where('basename', '==', path.basename(mappingFilename, '.json.gz')).get();

    // If file is new
    if ( fileSnapshot.empty && (! commitId || ! category || ! classificationName || ! mappingsLanguage) ) {

      console.log(chalk.bold.redBright('Missing required fields for new files!'));
      process.exit(0);

    }

    // Add file document
    if ( fileSnapshot.empty ) {

      console.log(chalk.bold.magenta('Adding file document to Firestore...'));

      const doc = await admin.firestore().collection('files').add({
        basename: path.basename(mappingFilename, '.json.gz'),
        version: 1,
        commitId: commitId
      });

      fileId = doc.id;
      finalVersion = 1;

      console.log(chalk.bold.magenta('File document created'));

    }
    // Update file document
    else {

      console.log(chalk.bold.magenta('Updating file document on Firestore...'));

      const doc = fileSnapshot.docs[0];

      fileId = doc.id;
      finalVersion = doc.get('version') + 1;
      deleteOldVersion = true;

      await doc.ref.update({
        version: doc.get('version') + 1,
        commitId: commitId.trim() || doc.get('commitId')
      });

      console.log(chalk.bold.magenta('File document updated'));

    }

    console.log(chalk.bold.magenta('Uploading the mappings file...'));

    // Upload the file
    await admin.storage().bucket().upload(mappingFilename, {
      gzip: true,
      destination: path.basename(mappingFilename, '.json.gz') + '_v' + finalVersion + '.json.gz',
      metadata: {
        cacheControl: 'public,max-age=31536000,immutable'
      }
    });

    console.log(chalk.bold.magenta('Mappings file uploaded'));

    // Add/update the category document
    if ( category.trim() ) {

      const categorySnapshot = await admin.firestore().collection('categories').where('name', '==', category).get();

      // Add category document
      if ( categorySnapshot.empty ) {

        console.log(chalk.bold.magenta('Adding category document to Firestore...'));

        const doc = await admin.firestore().collection('categories').add({
          name: category
        });

        categoryId = doc.id;

        console.log(chalk.bold.magenta('Category document created'));

      }
      // Update category document if needed
      else if ( category ) {

        console.log(chalk.bold.magenta('Updating category document on Firestore...'));

        const doc = categorySnapshot.docs[0];

        categoryId = doc.id;

        await doc.ref.update({
          name: category
        });

        console.log(chalk.bold.magenta('Category document updated'));

      }

    }

    // Read the description
    let renderedDescription: string = null;

    if ( descriptionFilename ) {

      console.log(chalk.bold.magenta('Loading the description file...'));

      const descriptionContent: string = fs.readFileSync(descriptionFilename, { encoding: 'utf8' });

      // Configure Showdown
      showdown
      .setOption('strikethrough', true)
      .setOption('tables', true)
      .setOption('tasklists', true)
      .setOption('disableForced4SpacesIndentedSublists', true)
      .setOption('simpleLineBreaks', true)
      .setOption('openLinksInNewWindow', true)
      .setOption('splitAdjacentBlockquotes', true);

      // Render markdown to HTML
      console.log(chalk.bold.magenta('Rendering the description file...'));

      const converter = new showdown.Converter();
      renderedDescription = converter.makeHtml(descriptionContent);

    }

    // Read built mappings package'e metadata
    const metadata = JSON.parse(zlib.unzipSync(fs.readFileSync(mappingFilename)).toString()).meta;

    // Add/update dictionary document
    if ( classificationName.trim() && mappingsLanguage.trim() ) {

      const dictionarySnapshot = await admin.firestore().collection('dictionaries')
      .where('name', '==', classificationName)
      .where('language', '==', mappingsLanguage)
      .get();

      // Add dictionary document
      if ( dictionarySnapshot.empty ) {

        console.log(chalk.bold.magenta('Adding dictionary document to Firestore...'));

        await admin.firestore().collection('dictionaries').add({
          name: classificationName,
          mappingFileId: fileId,
          categoryId: categoryId,
          description: renderedDescription,
          language: mappingsLanguage,
          length: metadata.length
        });

        console.log(chalk.bold.magenta('Dictionary document created'));

      }
      // Update dictionary document
      else {

        console.log(chalk.bold.magenta('Updating dictionary document on Firestore...'));

        const doc = dictionarySnapshot.docs[0];

        await doc.ref.update({
          name: classificationName || doc.get('name'),
          mappingFileId: fileId,
          categoryId: categoryId,
          description: renderedDescription || doc.get('description'),
          language: mappingsLanguage || doc.get('language'),
          length: metadata.length
        });

        console.log(chalk.bold.magenta('Dictionary document updated'));

      }

    }

    // Delete the old mappings file
    if ( deleteOldVersion ) {

      console.log(chalk.bold.magenta('Deleting the old mappings file...'));

      await admin.storage().bucket().file(path.basename(mappingFilename, '.json.gz') + '_v' + (finalVersion - 1) + '.json.gz').delete();

      console.log(chalk.bold.magenta('Old mappings file delete'));

    }

    console.log(chalk.bold.greenBright('Done!'));
    process.exit(0);

  }
  catch (error) {

    console.log(chalk.bold.redBright(error));

  }

})();

export interface Category {

  id: string;
  name: string;

}

export interface Dictionary {

  id: string;
  name: string;
  description: string;
  mappingFileId: string;
  categoryId: string;
  language: string;

}

export interface File {

  id: string;
  filename: string;
  version: number;
  commitId: string;

}
