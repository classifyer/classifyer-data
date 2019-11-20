/**
 * ******************************
 * *** RUN: npm run translate ***
 * ******************************
 * This script translates mappings from one classification to another.
 * It takes three CSV files named mappings.csv, translation.csv, and classification.csv.
 *
 * @param mappingPath The path to the mapping file
 * @param translationPath The path to the translation file
 * @param classificationPath The path to classification file
 * @param destinationPath The path to the destination file
 */

import fs from 'fs';
import path from 'path';
import csv from 'csvtojson';
import _ from 'lodash';
import ask from './ask';

(async () => {

  // Relative path validator
  const pathExists = (filename: string) => {

    if ( ! filename || ! fs.existsSync(path.resolve(__dirname, '..', filename)) )
      return new Error('File not found! Please enter a valid path relative to the project root.');

    return true;

  };

  const mappingPath = path.resolve(__dirname, '..', await ask('CSV mappings filename (relative to root):', true, pathExists));
  const translationPath = path.resolve(__dirname, '..', await ask('CSV translations filename (relative to root):', true, pathExists));
  const classificationPath = path.resolve(__dirname, '..', await ask('CSV classification filename (relative to root):', true, pathExists));
  const destinationPath = path.resolve(__dirname, '..', await ask('Destination filename (relative to root):', true));

  let mappings: Mapping[];
  let translation: Translation[];
  let classification: Classification[];
  let finalMappings: FinalMapping[] = [];
  let metadataHeaders: string[] = [];

  function renderField(value: string): string {

    if ( ! value ) value = '';
    value = value.replace(/"/g, '""');
    if ( value.includes(',') || value.includes('"') || value.includes('\n') ) value = `"${value}"`;

    return value;

  }

  // Read all files as JSON
  csv()
  .fromFile(mappingPath, { encoding: 'utf8' })
  .then(content => {

    mappings = content;

    return csv().fromFile(translationPath, { encoding: 'utf8' });

  })
  .then(content => {

    translation = content;

    return csv().fromFile(classificationPath, { encoding: 'utf8' });

  })
  .then(content => {

    classification = <any>content;

    // Read each mapping
    for ( const mapping of mappings ) {

      const matches = _.filter(translation, { source: mapping.code });

      // Generate final mappings based on matches
      for ( const match of matches ) {

        const classifications = _.filter(classification, { code: match.target });

        for ( const c of classifications ) {

          const m = {
            literal: mapping.literal,
            code: c.code,
            standard: c.standard,
            contributor: mapping.contributor
          };

          // Add classification metadata
          const metadataKeys = _.keys(c).filter(key => ! ['standard', 'code'].includes(key));

          if ( ! metadataHeaders.length ) metadataHeaders = metadataKeys;

          for ( const key of metadataKeys ) {

            m[key] = c[key];

          }

          finalMappings.push(m);

        }

      }

    }

    // Convert final mappings to CSV
    const headers = ['literal', 'code', 'standard', 'contributor'].concat(metadataHeaders);
    let csvContent: string = headers.join(',') + '\n';

    for ( const mapping of finalMappings ) {

      csvContent += `${renderField(mapping.literal)},${renderField(mapping.code)},${renderField(mapping.standard)},${renderField(mapping.contributor)}`;

      // Append metadata
      for ( const header of metadataHeaders ) {

        csvContent += `,${mapping[header]}`;

      }

      csvContent += '\n';

    }

    // Write to file
    fs.writeFileSync(destinationPath, csvContent);

    console.log('DONE');

  });

})();

interface Mapping {

  literal: string;
  code: string;
  contributor: string;

}

interface Translation {

  source: string;
  target: string;

}

interface Classification {

  standard: string;
  code: string;
  [metadata: string]: string;

}

interface FinalMapping {

  literal: string;
  code: string;
  standard: string;
  contributor: string;
  [metadata: string]: string;

}
