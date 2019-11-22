/**
 * ***************************************
 * *** RUN: npm run post-process -- -v ***
 * ***************************************
 * This script transforms all literals to lowercased, trims, and removes all duplicates
 * inside a mappings file (generated by the merge script).
 *
 * @param target The path to the mappings file
 * @param verbose If provided, this script logs all identical hashes
 */
import path from 'path';
import csv from 'csvtojson';
import { Parser } from 'json2csv';
import fs from 'fs';
import ask from './ask';

(async () => {

  // Relative path validator
  const pathExists = (filename: string) => {

    if ( ! filename || ! fs.existsSync(path.resolve(__dirname, '..', filename)) )
      return new Error('File not found! Please enter a valid path relative to the project root.');

    return true;

  };

  const target = path.resolve(__dirname, '..', await ask('CSV mappings filename (relative to root):', true, pathExists));
  const verbose: boolean = !! process.argv[3] && (process.argv[2].trim().toLowerCase() === '--verbose' || process.argv[2].trim().toLowerCase() === '-v');
  const hashTable: { [hash: string]: boolean } = {};
  let counter: number = 0;

  csv()
  .fromFile(target, { encoding: 'utf8' })
  .then((mappings: Mappings) => {

    for ( let i = 0; i < mappings.length; i++ ) {

      const row = mappings[i];

      // Transform literal
      row.literal = row.literal.toLowerCase().trim();

      // Get hash
      const hash = `${row.literal}:${row.code.trim()}`;

      // Delete duplicate (or empty literals)
      if ( hashTable[hash] || ! row.literal ) {

        if ( verbose ) console.log(hash);

        mappings.splice(i, 1);
        i--;
        counter++;

      }
      // Register otherwise
      else {

        hashTable[hash] = true;

      }

    }

    console.log(`Deleted ${counter} duplicates`);

    // Write to file
    fs.writeFileSync(target, (new Parser()).parse(mappings), { encoding: 'utf8' });

  });

})();

type Mappings = MappingEntry[];

interface MappingEntry {

  literal: string;
  code: string;
  contributor: string;
  [metadata: string]: string;

}
