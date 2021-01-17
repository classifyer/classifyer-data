/**
 * **************************
 * *** RUN: npm run build ***
 * **************************
 * This script builds a compressed JSON from the mappings file for internal use.
 * The target file's headers should be: literal,code,standard,contributor (any other columns will be considered as metadata).
 * The output will be saved at dist/filename.json.gz where the filename is the same as the target's.
 *
 * @param target The target CSV file
 */

import path from 'path';
import fs from 'fs';
import zlib from 'zlib';
import csv from 'csvtojson';
import stream from 'stream';
import ask from './ask';

// Relative path validator
const pathExists = (filename: string) => {

  if ( ! filename || ! fs.existsSync(path.resolve(__dirname, '..', filename)) )
    return new Error('File not found! Please enter a valid path relative to the project root.');

  return true;

};

(async () => {

  let possibleCorruption: boolean = false;
  const corruptionIdentifiers: string[] = ['�'];
  const target = path.resolve(__dirname, '..', await ask('CSV mappings filename (relative to root):', true, pathExists));

  csv()
  .fromFile(target, { encoding: 'utf8' })
  .then(async json => {

    // Transform array to key-value pair
    let dictionary = { data: {}, meta: { contributors: [], length: 0 } };

    for ( const row of json ) {

      // Check for possible corruption
      if ( ! possibleCorruption ) {

        const serialized = JSON.stringify(row);

        for ( const identifier of corruptionIdentifiers ) {

          if ( serialized.includes(identifier) ) {

            possibleCorruption = true;
            break;

          }

        }

      }

      const key = row.literal.trim().toLowerCase();
      const contributor = row.contributor.trim();

      delete row.literal;

      // Index contributor
      let contribIndex = dictionary.meta.contributors.indexOf(contributor);

      if ( contribIndex > -1 ) row.contributor = contribIndex;
      else {

        dictionary.meta.contributors.push(contributor);
        row.contributor = dictionary.meta.contributors.length - 1;

      }

      if ( ! dictionary.data.hasOwnProperty(key) ) dictionary.data[key] = [];

      dictionary.data[key].push(row);

      // Update length
      dictionary.meta.length++;

    }

    // Prompt corruption warning if detected
    if (
      possibleCorruption &&
      (await ask('Mappings file is possibly corrupted! This can occur due to invalid encoding (must use UTF-8).' +
      '\nDo you want to continue with the build? (y/n)', true,
      input => ['y', 'n', 'yes', 'no'].includes(input.toLowerCase()))) === 'n'
    )
      process.exit();

    // If dist directory doesn't exist
    if ( ! fs.existsSync(path.resolve(__dirname, '..', 'dist')) ) {

      fs.mkdirSync(path.resolve(__dirname, '..', 'dist'));

    }

    const gzip = zlib.createGzip();
    const readStream = new stream.Readable();
    const writeStream = fs.createWriteStream(path.resolve(__dirname, '..', 'dist', path.basename(target, path.extname(target)) + '.json.gz'));

    readStream._read = () => {};

    readStream
    .pipe(gzip)
    .pipe(writeStream)
    .on('finish', () => console.log('DONE'))
    .on('error', console.log);

    readStream.push(JSON.stringify(dictionary));
    readStream.push(null);

  });

})();
