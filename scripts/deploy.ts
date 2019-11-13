/**
 * This script deploys a mapping file to the Firebase Storage and Firestore.
 * Make sure to store your service account certificate at /firebase-cert.json
 *
 * SYNTAX: ts-node ./scripts/deploy.ts MAPPING DESCRIPTION COMMIT_ID CATEGORY NAME LANGUAGE
 *
 * @param MAPPING The path to the mapping file to deploy
 * @param DESCRIPTION The path to the description file
 * @param COMMIT_ID The commit ID where the file was generated
 * @param CATEGORY The category in lowercase
 * @param NAME The classification name
 * @param LANGUAGE The mappings language (two letters standard)
 *
 * EXAMPLE: ts-node ./scripts/deploy.ts ./dist/amco_nl.json.gz ./descriptions/amco.md 43ef049090f5c075c479eb89f0f1cc4d10ff590c locations amco nl
 */

import admin from 'firebase-admin';
import cert from '../firebase-cert.json';
import chalk from 'chalk';
import path from 'path';
import readline from 'readline';
import showdown from 'showdown';
import fs from 'fs';

const mappingFilename = path.resolve(__dirname, '..', process.argv[2]);
const descriptionFilename = path.resolve(__dirname, '..', process.argv[3]);
const commitId = process.argv[4].trim();
const category = process.argv[5].trim().toLowerCase();
const classificationName = process.argv[6].trim().toLowerCase();
const language = process.argv[7].trim().toLowerCase();

let fileId: string = '', categoryId: string = '';

function promptInput(): Promise<void> {

  return new Promise((resolve, reject) => {

    console.log('');
    console.log(chalk.bold.yellowBright('MAPPING:'), chalk.bold.blueBright(mappingFilename));
    console.log(chalk.bold.yellowBright('DESCRIPTION:'), chalk.bold.blueBright(descriptionFilename));
    console.log(chalk.bold.yellowBright('COMMIT_ID:'), chalk.bold.greenBright(commitId));
    console.log(chalk.bold.yellowBright('CATEGORY:'), chalk.bold.greenBright(category));
    console.log(chalk.bold.yellowBright('NAME:'), chalk.bold.greenBright(classificationName));
    console.log(chalk.bold.yellowBright('LANGUAGE:'), chalk.bold.greenBright(language));
    console.log('');

    let rl = readline.createInterface(process.stdin, process.stdout);

    rl.setPrompt('Do you want to proceed with the deploy? (y/n) ');
    rl.prompt();
    rl
    .on('line', line => {

      if ( line.trim().toLowerCase() === 'y' ) return resolve();
      if ( line.trim().toLowerCase() === 'n' ) return rl.close();

      rl.prompt();

    })
    .on('close', reject);

  });

}

(async () => {

  try {

    await promptInput();

  }
  catch (error) {

    process.exit(0);

  }

  try {

    admin.initializeApp({
      credential: admin.credential.cert(<any>cert),
      storageBucket: `gs://${cert.project_id}.appspot.com`
    });

    console.log(chalk.bold.magenta('Uploading the mappings file...'));

    // Upload the file
    await admin.storage().bucket().upload(mappingFilename, { gzip: true });

    console.log(chalk.bold.magenta('Mappings file uploaded'));

    // Add/update the file document
    const fileSnapshot = await admin.firestore().collection('files').where('filename', '==', path.basename(mappingFilename)).get();

    // Add file document
    if ( fileSnapshot.empty ) {

      console.log(chalk.bold.magenta('Adding file document to Firestore...'));

      const doc = await admin.firestore().collection('files').add({
        filename: path.basename(mappingFilename),
        version: 1,
        commitId: commitId
      });

      fileId = doc.id;

      console.log(chalk.bold.magenta('File document created'));

    }
    // Update file document
    else {

      console.log(chalk.bold.magenta('Updating file document on Firestore...'));

      const doc = fileSnapshot.docs[0];

      fileId = doc.id;

      await doc.ref.update({
        version: doc.get('version') + 1,
        commitId: commitId
      });

      console.log(chalk.bold.magenta('File document updated'));

    }

    // Add/update the category document
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
    // Update category document
    else {

      console.log(chalk.bold.magenta('Updating category document on Firestore...'));

      const doc = categorySnapshot.docs[0];

      categoryId = doc.id;

      await doc.ref.update({
        name: category
      });

      console.log(chalk.bold.magenta('Category document updated'));

    }

    // Read the description
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
    const renderedDescription = converter.makeHtml(descriptionContent);

    // Add/update dictionary document
    const dictionarySnapshot = await admin.firestore().collection('dictionaries')
    .where('name', '==', classificationName)
    .where('language', '==', language)
    .get();

    // Add dictionary document
    if ( dictionarySnapshot.empty ) {

      console.log(chalk.bold.magenta('Adding dictionary document to Firestore...'));

      await admin.firestore().collection('dictionaries').add({
        name: classificationName,
        mappingFileId: fileId,
        categoryId: categoryId,
        description: renderedDescription,
        language: language
      });

      console.log(chalk.bold.magenta('Dictionary document created'));

    }
    // Update dictionary document
    else {

      console.log(chalk.bold.magenta('Updating dictionary document on Firestore...'));

      const doc = dictionarySnapshot.docs[0];

      await doc.ref.update({
        name: classificationName,
        mappingFileId: fileId,
        categoryId: categoryId,
        description: renderedDescription,
        language: language
      });

      console.log(chalk.bold.magenta('Dictionary document updated'));

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
