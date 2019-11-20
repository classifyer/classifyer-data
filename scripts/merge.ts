/**
 * **************************
 * *** RUN: npm run merge ***
 * **************************
 * This script merges a mappings and classification file into one.
 * The classification.csv headers should be: standard,code (any other columns will be considered as metadata).
 * The mappings.csv headers should be: literal,code,contributor.
 *
 * @param targetDir The directory which contains mappings.csv and classification.csv
 * @param destination The path to the destination where the merged file should be saved.
 */
import path from 'path';
import csv from 'csvtojson';
import fs from 'fs';
import ask from './ask';

(async () => {

  // Relative path validator
  const validDir = (filename: string) => {

    if ( ! filename || ! fs.existsSync(path.resolve(__dirname, '..', filename)) )
      return new Error('Directory not found! Please enter a valid path relative to the project root.');

    const files = fs.readdirSync(path.resolve(__dirname, '..', filename));

    if ( ! files.includes('mappings.csv') || ! files.includes('classification.csv') )
      return new Error('Directory does not contain the necessary files!');

    return true;

  };

  const targetDir = path.resolve(__dirname, '..', await ask('Path to directory containing classification.csv and mappings.csv (relative to root):', true, validDir));
  const destination = path.resolve(__dirname, '..', await ask('Destination filename (relative to root):', true));
  const targetClassification = path.resolve(targetDir, 'classification.csv');
  const targetMappings = path.resolve(targetDir, 'mappings.csv');
  let classification: any[], mappings: any[];

  function renderField(value: string): string {

    if ( ! value ) value = '';
    value = value.replace(/"/g, '""');
    if ( value.includes(',') || value.includes('"') || value.includes('\n') ) value = `"${value}"`;

    return value;

  }

  csv()
  .fromFile(targetClassification, { encoding: 'utf8' })
  .then(json => {

    classification = json;

    return csv().fromFile(targetMappings, { encoding: 'utf8' });

  })
  .then(json => {

    mappings = json;

    // Transform classifications
    const temp = {};
    let metadata: string[] = [];

    for ( const row of classification ) {

      // Read metadata headers once
      if ( ! metadata.length ) metadata = Object.keys(row).filter(header => ! ['standard', 'code'].includes(header));

      if ( ! temp[row.code] ) temp[row.code] = [];

      temp[row.code].push(row);

    }

    // Merge into one file
    let merged = 'literal,code,standard,contributor';

    if ( metadata.length ) merged += ',' + metadata.join(',');

    merged += '\n';

    for ( const row of mappings ) {

      if ( temp[row.code] ) {

        for ( const match of temp[row.code] ) {

          merged += `${renderField(row.literal)},${renderField(row.code)},${renderField(match.standard)},${renderField(row.contributor)}`;

          // Append metadata
          for ( const header of metadata ) {

            merged += `,${renderField(match[header])}`;

          }

          merged += '\n';

        }

      }

    }

    fs.writeFileSync(destination, merged);

    console.log('DONE');

  });

})();
