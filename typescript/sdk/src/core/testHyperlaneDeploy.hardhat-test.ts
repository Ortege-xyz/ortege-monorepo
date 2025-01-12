import '@nomiclabs/hardhat-ethers';
import '@nomiclabs/hardhat-waffle';
import { expect } from 'chai';
import { ContractReceipt } from 'ethers';
import { ethers } from 'hardhat';

import { TestMailbox, TestRecipient__factory } from '@ortege/core';
import { addressToBytes32 } from '@ortege/utils';

import { Chains } from '../consts/chains';
import { MultiProvider } from '../providers/MultiProvider';

import { TestCoreApp } from './TestCoreApp';
import { TestCoreDeployer } from './TestCoreDeployer';

const localChain = Chains.test1;
const remoteChain = Chains.test2;
const message = '0xdeadbeef';

describe('TestCoreDeployer', async () => {
  let testCoreApp: TestCoreApp,
    localMailbox: TestMailbox,
    remoteMailbox: TestMailbox,
    dispatchReceipt: ContractReceipt;

  beforeEach(async () => {
    const [signer] = await ethers.getSigners();

    const multiProvider = MultiProvider.createTestMultiProvider({ signer });
    const deployer = new TestCoreDeployer(multiProvider);
    testCoreApp = await deployer.deployApp();

    const recipient = await new TestRecipient__factory(signer).deploy();
    localMailbox = testCoreApp.getContracts(localChain).mailbox;

    const dispatchResponse = localMailbox.dispatch(
      multiProvider.getDomainId(remoteChain),
      addressToBytes32(recipient.address),
      message,
    );
    await expect(dispatchResponse).to.emit(localMailbox, 'Dispatch');
    dispatchReceipt = await testCoreApp.multiProvider.handleTx(
      localChain,
      dispatchResponse,
    );
    remoteMailbox = testCoreApp.getContracts(remoteChain).mailbox;
    await expect(
      remoteMailbox.dispatch(
        multiProvider.getDomainId(localChain),
        addressToBytes32(recipient.address),
        message,
      ),
    ).to.emit(remoteMailbox, 'Dispatch');
  });

  it('processes outbound messages for a single domain', async () => {
    const responses = await testCoreApp.processOutboundMessages(localChain);
    expect(responses.get(remoteChain)!.length).to.equal(1);
  });

  it('processes outbound messages for two domains', async () => {
    const localResponses = await testCoreApp.processOutboundMessages(
      localChain,
    );
    expect(localResponses.get(remoteChain)!.length).to.equal(1);
    const remoteResponses = await testCoreApp.processOutboundMessages(
      remoteChain,
    );
    expect(remoteResponses.get(localChain)!.length).to.equal(1);
  });

  it('processes all messages', async () => {
    const responses = await testCoreApp.processMessages();
    expect(responses.get(localChain)!.get(remoteChain)!.length).to.equal(1);
    expect(responses.get(remoteChain)!.get(localChain)!.length).to.equal(1);
  });

  it('waits on message processing receipts', async () => {
    const [receipts] = await Promise.all([
      testCoreApp.waitForMessageProcessing(dispatchReceipt),
      testCoreApp.processOutboundMessages(localChain),
    ]);
    expect(receipts).to.have.length(1);
  });
});
