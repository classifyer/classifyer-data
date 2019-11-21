/**
 * ****************************************
 * *** RUN: npm run update-contributors ***
 * ****************************************
 * This script deploys the contributors list from ./CONTRIBUTORS.md to Firestore.
 * Make sure to store your service account certificate at "/firebase-cert.json".
 */

import admin from 'firebase-admin';
import cert from '../firebase-cert.json';
import chalk from 'chalk';
import path from 'path';
import showdown from 'showdown';
import fs from 'fs';

(async () => {

  try {

    admin.initializeApp({
      credential: admin.credential.cert(<any>cert)
    });

    // Read the contributors list
    console.log(chalk.bold.magenta('Loading the contributors list...'));

    const contributorsContent: string = fs.readFileSync(path.resolve(__dirname, '..', 'CONTRIBUTORS.md'), { encoding: 'utf8' });

    // Configure Showdown
    showdown
    .setOption('strikethrough', true)
    .setOption('disableForced4SpacesIndentedSublists', true)
    .setOption('simpleLineBreaks', true)
    .setOption('openLinksInNewWindow', true);

    // Render markdown to HTML
    console.log(chalk.bold.magenta('Rendering the list...'));

    const converter = new showdown.Converter();
    const renderedList = converter.makeHtml(contributorsContent);

    // Update the contributors list document
    console.log(chalk.bold.magenta('Updating the contributors list in Firestore...'));

    await admin.firestore().collection('contributors').doc('list').set({
      html: renderedList
    });


    console.log(chalk.bold.magenta('Contributors list updated'));

    console.log(chalk.bold.greenBright('Done!'));
    process.exit(0);

  }
  catch (error) {

    console.log(chalk.bold.redBright(error));

  }

})();
