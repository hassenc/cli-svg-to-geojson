import type { Command } from 'commander';
import fs from 'fs';
import { pathologize, svgToGeoJSON } from './pathologize';

const doConvert = async ({ file }) => {
  const fileData = fs.readFileSync(file, 'utf8');
  const result = await pathologize(fileData)
    .then(svgToGeoJSON)
    .catch((err) => {
      console.error(err);
    });
  fs.writeFileSync('convert.YYYY-mm-dd.json', JSON.stringify(result), 'utf8');
  console.log(JSON.stringify(result));
};

export default (parentProgram: Command): void => {
  const convertProgram = parentProgram
    .command('convert');

  convertProgram
    .description('Convert svg to geoJson features')
    .requiredOption('-f, --file [svg]', 'file to convert, need to be an svg file.')
    .option('-o, --output [output]', 'by default it will be named: convert.YYYY-mm-dd.json')
    .action(async (options) => {
      const { file } = options;
      const res = doConvert({ file });
      return res;
    });
};
