import { program } from 'commander';
import { initCommands } from './init';

program.description('CONVERTER CLI');

initCommands(program);

(async () => {
  try {
    await program.parseAsync();
    process.exit(0);
  } catch (e) {
    console.log(e, 'Command encountered an error');
    process.exit(1);
  }
})();
