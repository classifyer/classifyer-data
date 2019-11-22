/**
* ****************
* *** INTERNAL ***
* ****************
* This script provides an API for interactive CLI input collection.
*/
import chalk from 'chalk';
import readline from 'readline';

/**
* Asks for input from the command line.
* @param question The question to prompt.
* @param required Whether to repeat the question endlessly if no input was given.
* @param validator A validator function to validate the input.
*/
export default function ask(question: string, required?: boolean, validator?: (input: string) => boolean|Error|Promise<boolean|Error>): Promise<string> {

  const DEF_ERR_MSG: string = 'Invalid input!';

  return new Promise((resolve, reject) => {

    let rl = readline.createInterface(process.stdin, process.stdout);

    rl.setPrompt(chalk.bold.yellow(question + ' '));
    rl.prompt();

    rl.on('line', async answer => {

      // Prompt the question again if answer was empty and required and there is no validator provided
      if ( required && ! validator && (! answer || ! answer.trim()) ) return rl.prompt();

      // If validator is provided
      if ( validator ) {

        let result: Error|boolean;

        try {

          // Run the validator
          result = await validator(answer);

        }
        // Validator threw an exception
        catch (error) {

          error.message = `VALIDATOR_EXCEPTION: ${error.message}`;

          reject(error);
          return rl.close();

        }

        // If result is false or Error
        if ( ! result || result instanceof Error ) {

          console.log(chalk.bold.red(result instanceof Error ? result.message : DEF_ERR_MSG));

          // If required, prompt again
          if ( required ) {

            return rl.prompt();

          }
          // Otherwise, reject the promise
          else {

            reject(new Error(`VALIDATION_FAILED: ${result instanceof Error ? result.message : DEF_ERR_MSG}`));
            return rl.close();

          }

        }

      }

      resolve(answer);
      rl.close();

    });

  });

}
