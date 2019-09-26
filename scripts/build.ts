/**
 * This script builds a compressed JSON from the mappings file for internal use.
 * The target file's headers should be: literal,code,standard,contributor (any other columns will be considered as metadata)
 * The output will be saved at dist/filename.json.gz where the filename is the same as the target's
 *
 * SYNTAX: ts-node ./scripts/build.ts TARGET
 *
 * @param TARGET The target CSV file
 *
 * EXAMPLE: ts-node ./scripts/build.ts ./mappings/amco_nl.csv
 */
import path from 'path';
import fs from 'fs';
import zlib from 'zlib';
import csv from 'csvtojson';
import stream from 'stream';

const target = path.resolve(__dirname, '..', process.argv[2]);

csv()
.fromFile(target, { encoding: 'utf8' })
.then(json => {

  // Transform array to key-value pair
  let data = {};

  for ( const row of json ) {

    const key = row.literal;

    delete row.literal;

    if ( ! data[key] ) data[key] = [];

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
