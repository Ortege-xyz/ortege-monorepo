import { BigNumber } from 'ethers';
import { format } from 'util';

import { error, promiseObjAll } from '@ortege/utils';

import { Contexts } from '../../config/contexts';
import {
  DeterministicKeyRoles,
  getDeterministicKey,
} from '../../src/funding/deterministic-keys';
import { Role } from '../../src/roles';
import { assertChain } from '../../src/utils/utils';
import { getArgs, getEnvironmentConfig } from '../utils';

async function main() {
  const argv = await getArgs()
    .string('role')
    .choices(
      'role',
      Object.keys(DeterministicKeyRoles).filter((x) => !(parseInt(x) >= 0)),
    )
    .string('address')
    .describe('address', 'The address to fund')
    .number('gas-amount')
    .alias('g', 'gas-amount')
    .describe(
      'gas-amount',
      'The amount of gas this key should have on each chain',
    )
    .demandOption('g')
    .string('chains-to-skip')
    .array('chains-to-skip')
    .describe('chains-to-skip', 'Chains to skip sending from or sending to.')
    .default('chains-to-skip', [])
    .coerce('chains-to-skip', (chainStrs: string[]) =>
      chainStrs.map((chainStr: string) => assertChain(chainStr)),
    ).argv;

  if (argv.address === undefined && argv.role === undefined) {
    throw new Error('Have to specify either --role or --address');
  }

  const coreConfig = getEnvironmentConfig(argv.environment);
  const multiProvider = await coreConfig.getMultiProvider(
    Contexts.Hyperlane,
    Role.Deployer,
  );

  const address =
    argv.address ||
    (
      await getDeterministicKey(
        argv.environment,
        // @ts-ignore
        DeterministicKeyRoles[argv.role],
      )
    ).address;

  await promiseObjAll(
    multiProvider.mapKnownChains(async (chain) => {
      if (argv.chainsToSkip?.includes(chain)) {
        return;
      }
      // fund signer on each network with gas * gasPrice
      const provider = multiProvider.getProvider(chain);
      const overrides = multiProvider.getTransactionOverrides(chain);
      const actual = await provider.getBalance(address);
      const gasPrice = BigNumber.from(
        await (overrides.gasPrice ||
          overrides.maxFeePerGas ||
          provider.getGasPrice()),
      );
      const desired = gasPrice.mul(argv.gasAmount!);
      const value = desired.sub(actual);
      if (value.gt(0)) {
        console.log(
          `Funding ${address} on chain '${chain}' with ${value} native tokens`,
        );
        await multiProvider.sendTransaction(chain, {
          to: address,
          value,
        });
      }
    }),
  );
}

main().catch((err) => {
  error('Error occurred in main', {
    // JSON.stringifying an Error returns '{}'.
    // This is a workaround from https://stackoverflow.com/a/60370781
    error: format(err),
  });
  process.exit(1);
});
