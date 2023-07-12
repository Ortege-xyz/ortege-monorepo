import { ChainMap, CompilerOptions, ContractVerifier } from '@ortege/sdk';

import { fetchGCPSecret } from '../src/utils/gcloud';
import { execCmd, readFileAtPath, readJSONAtPath } from '../src/utils/utils';

import { assertEnvironment, getArgs, getEnvironmentConfig } from './utils';

// Requires https://github.com/crytic/solc-select to be installed and
// present in your $PATH. The current solc compiler version should
// already be installed via `solc-select install $VERSION`
async function main() {
  const argv = await getArgs()
    // This file can be generated by running `yarn hardhat flatten > flattened.sol`,
    // and then removing any lines with SPDX identifiers (`solc` complains otherwise).
    .string('source')
    .describe('source', 'flattened solidity source file')
    .demandOption('source')
    .string('artifacts')
    .describe('artifacts', 'verification artifacts JSON file')
    .demandOption('artifacts')
    .string('network')
    .describe('network', 'optional target network').argv;

  const environment = assertEnvironment(argv.e!);
  const config = getEnvironmentConfig(environment);
  const multiProvider = await config.getMultiProvider();

  const verification = readJSONAtPath(argv.artifacts!);

  const sourcePath = argv.source!;
  const flattenedSource = readFileAtPath(sourcePath);

  // from solidity/core/hardhat.config.ts
  const compilerOptions: CompilerOptions = {
    codeformat: 'solidity-single-file',
    compilerversion: 'v0.8.17+commit.8df45f5f',
    optimizationUsed: '1',
    runs: '999999',
  };

  const versionRegex = /v(\d.\d.\d+)\+commit.\w+/;
  const matches = versionRegex.exec(compilerOptions.compilerversion);
  if (!matches) {
    throw new Error(
      `Invalid compiler version ${compilerOptions.compilerversion}`,
    );
  }

  // ensures flattened source is compilable
  await execCmd(`solc-select use ${matches[1]}`);
  await execCmd(`solc ${sourcePath}`);

  const apiKeys: ChainMap<string> = (await fetchGCPSecret(
    'explorer-api-keys',
    true,
  )) as any;

  const verifier = new ContractVerifier(
    verification,
    multiProvider,
    apiKeys,
    flattenedSource,
    compilerOptions,
  );

  return verifier.verify(argv.network ? [argv.network] : undefined);
}

main().then(console.log).catch(console.error);
