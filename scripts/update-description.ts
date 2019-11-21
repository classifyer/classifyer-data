/**
 * ***************************************
 * *** RUN: npm run update-description ***
 * ***************************************
 * This script deploys a classification description file individually to Firestore.
 * Make sure to store your service account certificate at "/firebase-cert.json".
 *
 * @param classificationName The classification name
 * @param classificationLanguage The mappings language (two letters standard)
 * @param descriptionFilename The path to the description file
 */

import admin from 'firebase-admin';
import cert from '../firebase-cert.json';
import chalk from 'chalk';
import path from 'path';
import showdown from 'showdown';
import fs from 'fs';
import ask from './ask';

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
  const descriptionFilename = path.resolve(__dirname, '..', await ask('Description filename (relative to root):', true, pathExists));
  const classificationName = (await ask('Classification name:', true)).trim().toLowerCase();
  const classificationLanguage = (await ask('Classification language:', true)).trim().toLowerCase();

  console.log('');

  // Double check the input
  console.log(chalk.bold.greenBright('Description:            '), descriptionFilename);
  console.log(chalk.bold.greenBright('Classification Name:    '), classificationName);
  console.log(chalk.bold.greenBright('Classification Language:'), classificationLanguage);

  console.log('');

  if ( ['no', 'n'].includes((await ask('Are you sure you want to deploy? (y/n)', true, yesNo)).trim().toLowerCase()) ) {

    console.log(chalk.bold.red('Aborted!'));
    return;

  }

  try {

    admin.initializeApp({
      credential: admin.credential.cert(<any>cert)
    });

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

    // Locate the dictionary document
    const docs = await admin.firestore().collection('dictionaries')
    .where('name', '==', classificationName)
    .where('language', '==', classificationLanguage)
    .get();

    // If dictionary not found
    if ( docs.empty ) {

      console.log(chalk.bold.redBright('Dictionary not found!'));
      process.exit(0);

    }

    const doc = docs.docs[0];

    console.log(chalk.bold.magenta('Updating dictionary description...'));

    // Update the dictionary
    await doc.ref.update({
      description: renderedDescription
    });

    console.log(chalk.bold.greenBright('Done!'));
    process.exit(0);

  }
  catch (error) {

    console.log(chalk.bold.redBright(error));

  }

})();
