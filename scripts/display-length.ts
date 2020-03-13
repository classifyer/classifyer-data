/**
 * ***********************************
 * *** RUN: npm run display-length ***
 * ***********************************
 * This script displays the total number of literals in a built mappings package.
 *
 * @param target The path to the built mappings package
 */

import fs from 'fs';
import zlib from 'zlib';
import ask from './ask';
import path from 'path';

// Relative path validator
const pathExists = (filename: string) => {

  if ( ! filename || ! fs.existsSync(path.resolve(__dirname, '..', filename)) )
    return new Error('File not found! Please enter a valid path relative to the project root.');

  return true;

};

(async () => {

  const target = path.resolve(__dirname, '..', await ask('Built mappings filename (relative to root):', true, pathExists));

  console.log(JSON.parse(zlib.unzipSync(fs.readFileSync(target)).toString()).meta.length);

})();
