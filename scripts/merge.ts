/**
 * **************************
 * *** RUN: npm run merge ***
 * **************************
 * This script merges a mappings and classification file into one.
 * The classification.csv headers should be: standard,code (any other columns will be considered as metadata).
 * The mappings.csv headers should be: literal,code,contributor.
 *
 * @param mappingPath The path to the mapping file
 * @param classificationPath The path to classification file
 * @param destination The path to the destination where the merged file should be saved.
 */
import path from 'path';
import csv from 'csvtojson';
import fs from 'fs';
import ask from './ask';

(async () => {

  // Relative path validator
  const pathExists = (filename: string) => {

    if ( ! filename || ! fs.existsSync(path.resolve(__dirname, '..', filename)) )
      return new Error('File not found! Please enter a valid path relative to the project root.');

    return true;

  };

  const targetMappings = path.resolve(__dirname, '..', await ask('CSV mappings filename (relative to root):', true, pathExists));
  const targetClassification = path.resolve(__dirname, '..', await ask('CSV classification filename (relative to root):', true, pathExists));
  const destination = path.resolve(__dirname, '..', await ask('Destination filename (relative to root):', true));
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
