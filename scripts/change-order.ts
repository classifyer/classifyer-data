/**
 * *********************************
 * *** RUN: npm run change-order ***
 * *********************************
 * This script updates the order field on either a dictionary or category in Firestore.
 * Make sure to store your service account certificate at "/firebase-cert.json".
 *
 * @param documentType The type of document (either category or dictionary)
 * @param classificationName The classification name (if dictionary)
 * @param mappingsLanguage The mappings language (two letters standard) (if dictionary)
 * @param categoryName (if category)
 * @param newOrder The new order number
 */

import admin from 'firebase-admin';
import cert from '../firebase-cert.json';
import chalk from 'chalk';
import ask from './ask';

(async () => {

  // Enum validator
  const includedIn = (array: string[]) => {

    return (input: string) => array.map(i => i.toLowerCase()).includes(input.toLowerCase().trim());

  };

  // Number validator
  const numCheck = (input: string) => typeof +input === 'number' && ! isNaN(+input);

  // Collect the input parameters
  let classificationName: string, mappingsLanguage: string, categoryName: string;
  const documentType = await ask('Document Type (dictionary/category):', true, includedIn(['dictionary', 'category']));

  if ( documentType === 'dictionary' ) {

    classificationName = (await ask('Classification Name:', true)).trim();
    mappingsLanguage = (await ask('Mappings Language:', true)).trim();

  }
  else {

    categoryName = (await ask('Category Name:', true)).trim();

  }

  try {

    admin.initializeApp({
      credential: admin.credential.cert(<any>cert),
      storageBucket: `gs://${cert.project_id}.appspot.com`
    });

    // Find dictionary
    if ( documentType === 'dictionary' ) {

      const snapshot = await admin.firestore().collection('dictionaries')
      .where('name', '==', classificationName)
      .where('language', '==', mappingsLanguage)
      .get();

      // If not found
      if ( snapshot.empty ) {

        console.log(chalk.bold.redBright('Dictionary not found!'));
        process.exit(0);

      }

      // Display order number
      const doc = snapshot.docs[0];

      console.log('Current order number is', chalk.bold.yellow(doc.get('order') || '0'));

      // Ask for new order number
      const newOrder = +(await ask('New Order:', true, numCheck));

      console.log(chalk.bold.magenta('Updating the dictionary...'));

      // Update the dictionary order
      await doc.ref.update({ order: newOrder });

      console.log(chalk.bold.magenta('Dictionary updated'));

    }
    // Find category
    else {

      const snapshot = await admin.firestore().collection('dictionaries')
      .where('name', '==', categoryName)
      .get();

      // If not found
      if ( snapshot.empty ) {

        console.log(chalk.bold.redBright('Category not found!'));
        process.exit(0);

      }

      // Display order number
      const doc = snapshot.docs[0];

      console.log('Current order number is', chalk.bold.yellow(doc.get('order') || '0'));

      // Ask for new order number
      const newOrder = +(await ask('New Order:', true, numCheck));

      console.log(chalk.bold.magenta('Updating the category...'));

      // Update the dictionary order
      await doc.ref.update({ order: newOrder });

      console.log(chalk.bold.magenta('Category updated'));

    }

    console.log(chalk.bold.greenBright('Done!'));
    process.exit(0);

  }
  catch (error) {

    console.log(chalk.bold.redBright(error));

  }

})();
