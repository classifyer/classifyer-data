/**
 * This script translates mappings from one classification to another.
 * It takes three CSV files named mappings.csv, translation.csv, and classification.csv.
 *
 * SYNTAX: ts-node ./scripts/translate.ts MAPPING TRANSLATION CLASSIFICATION DESTINATION
 *
 * @param MAPPING The path to the mapping file
 * @param TRANSLATION The path to the translation file
 * @param CLASSIFICATION The path to classification file
 * @param DESTINATION The path to the destination file
 *
 * EXAMPLE: ts-node ./scripts/translate.ts ./src/mappings.csv ./src/translation.csv ./src/classification.csv ./dist/final.csv
 */

import fs from 'fs';
import path from 'path';
import csv from 'csvtojson';
import _ from 'lodash';

const mappingPath = path.resolve(__dirname, '..', process.argv[2]);
const translationPath = path.resolve(__dirname, '..', process.argv[3]);
const classificationPath = path.resolve(__dirname, '..', process.argv[4]);
const destinationPath = path.resolve(__dirname, '..', process.argv[5]);

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
