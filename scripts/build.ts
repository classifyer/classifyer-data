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

  const target = path.resolve(__dirname, '..', await ask('CSV mappings filename (relative to root):', true, pathExists));

  csv()
  .fromFile(target, { encoding: 'utf8' })
  .then(json => {

    // Transform array to key-value pair
    let data = {};

    for ( const row of json ) {

      const key = row.literal.trim().toLowerCase();

      delete row.literal;

      if ( ! data.hasOwnProperty(key) ) data[key] = [];

      data[key].push(row);

    }

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

    readStream.push(JSON.stringify(data));
    readStream.push(null);

  });

})();
