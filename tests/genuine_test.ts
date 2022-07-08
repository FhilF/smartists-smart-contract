import {
  Clarinet,
  Tx,
  Chain,
  Account,
  types,
  assertEquals,
} from "../src/deps.ts";
import {
  createGenuine,
  transfer,
  listInUstx,
  unlistInUstx,
  releaseGenuine,
  buyInUstx,
  releaseUstxToSeller,
  buyLicenseInUstx,
  renewLicenseInUstx,
  getTimestamp,
} from "../src/genuine-client.ts";

Clarinet.test({
  name: "Ensure that users can mint and return its id",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    let wallet_1 = accounts.get("wallet_1")!;
    let block = chain.mineBlock([
      createGenuine(3, "sample-metadata-uri", wallet_1.address),
    ]);
    block.receipts[0].result.expectOk().expectUint(1);
  },
});

Clarinet.test({
  name: "Ensure that users can't mint NFT with invalid levels",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    let wallet_1 = accounts.get("wallet_1")!;
    let block = chain.mineBlock([
      createGenuine(6, "sample-metadata-uri", wallet_1.address),
    ]);
    block.receipts[0].result.expectErr().expectUint(400);
  },
});

Clarinet.test({
  name: "Ensure that users can transfer own nft",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    let wallet_1 = accounts.get("wallet_1")!;
    let wallet_2 = accounts.get("wallet_2")!;
    let block = chain.mineBlock([
      createGenuine(3, "sample-metadata-uri", wallet_1.address),
      transfer(1, wallet_1.address, wallet_2.address),
    ]);
    block.receipts[0].result.expectOk().expectUint(1);
    block.receipts[1].result.expectOk();

    let nftEventTransfer = block.receipts[1].events[0];
    let logEventTransfer = block.receipts[1].events[1];

    assertEquals(
      nftEventTransfer.nft_transfer_event.recipient,
      wallet_2.address
    );
  },
});

Clarinet.test({
  name: "Ensure that users can't transfer other NFT",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    let deployer = accounts.get("deployer")!;
    let wallet_1 = accounts.get("wallet_1")!;
    let wallet_2 = accounts.get("wallet_2")!;
    let block = chain.mineBlock([
      createGenuine(3, "sample-metadata-uri", wallet_1.address),
      transfer(1, wallet_1.address, wallet_2.address, deployer.address),
    ]);
    block.receipts[0].result.expectOk().expectUint(1);
    block.receipts[1].result.expectErr().expectUint(403);
  },
});

Clarinet.test({
  name: "Ensure that NFT can be listed and unlisted",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    let wallet_1 = accounts.get("wallet_1")!;
    let block = chain.mineBlock([
      createGenuine(3, "sample-metadata-uri", wallet_1.address),
      listInUstx(1, 50000000, wallet_1.address),
      unlistInUstx(1, wallet_1.address),
    ]);
    block.receipts[0].result.expectOk().expectUint(1);
    block.receipts[1].result.expectOk().expectBool(true);
    block.receipts[2].result.expectOk().expectBool(true);
  },
});

Clarinet.test({
  name: "Ensure that users can't list and unlist other NFT",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    let wallet_1 = accounts.get("wallet_1")!;
    let wallet_2 = accounts.get("wallet_2")!;
    let block = chain.mineBlock([
      createGenuine(3, "sample-metadata-uri", wallet_1.address),
      listInUstx(1, 50000000, wallet_2.address),
      listInUstx(1, 50000000, wallet_1.address),
      unlistInUstx(1, wallet_2.address),
    ]);
    block.receipts[0].result.expectOk().expectUint(1);
    block.receipts[1].result.expectErr().expectUint(403);
    block.receipts[2].result.expectOk().expectBool(true);
    block.receipts[3].result.expectErr().expectUint(403);
  },
});

Clarinet.test({
  name: "Ensure that NFT can't be transferred when listed",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    let deployer = accounts.get("deployer")!;
    let wallet_1 = accounts.get("wallet_1")!;
    let wallet_2 = accounts.get("wallet_2")!;
    let block = chain.mineBlock([
      createGenuine(3, "sample-metadata-uri", wallet_1.address),
      listInUstx(1, 50000000, wallet_1.address),
      transfer(1, wallet_1.address, wallet_2.address),
    ]);
    block.receipts[0].result.expectOk().expectUint(1);
    block.receipts[1].result.expectOk().expectBool(true);
    block.receipts[2].result.expectErr().expectUint(505);
  },
});

Clarinet.test({
  name: "Ensure that NFT can be listed, bought, and released",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    let deployer = accounts.get("deployer")!;
    let wallet_1 = accounts.get("wallet_1")!;
    let wallet_2 = accounts.get("wallet_2")!;
    let block = chain.mineBlock([
      createGenuine(3, "sample-metadata-uri", wallet_1.address),
      listInUstx(1, 50_000_000, wallet_1.address),
      buyInUstx(1, wallet_2.address),
      releaseGenuine(1, wallet_1.address),
    ]);
    block.receipts[0].result.expectOk().expectUint(1);
    block.receipts[1].result.expectOk().expectBool(true);
    block.receipts[2].result.expectOk().expectBool(true);
    block.receipts[3].result.expectOk().expectUint(1);
    let stxEventbuy = block.receipts[2].events[0];
    let nftEventbuy = block.receipts[2].events[1];
    let logEventbuy = block.receipts[2].events[2];

    let nftEventRelease = block.receipts[3].events[0];
    let logEventRelease = block.receipts[3].events[1];
    assertEquals(stxEventbuy.stx_transfer_event.amount, "50000000");
    assertEquals(
      stxEventbuy.stx_transfer_event.recipient,
      deployer.address + ".genuine"
    );
    assertEquals(
      nftEventbuy.nft_transfer_event.recipient,
      deployer.address + ".genuine"
    );

    assertEquals(
      nftEventRelease.nft_transfer_event.sender,
      deployer.address + ".genuine"
    );
    assertEquals(
      nftEventRelease.nft_transfer_event.recipient,
      wallet_2.address
    );
  },
});

Clarinet.test({
  name: "Ensure that NFT can't be bought when unlisted",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    let deployer = accounts.get("deployer")!;
    let wallet_1 = accounts.get("wallet_1")!;
    let wallet_2 = accounts.get("wallet_2")!;
    let block = chain.mineBlock([
      createGenuine(3, "sample-metadata-uri", wallet_1.address),
      listInUstx(1, 50000000, wallet_1.address),
      unlistInUstx(1, wallet_1.address),
      buyInUstx(1, wallet_2.address),
    ]);
    block.receipts[0].result.expectOk().expectUint(1);
    block.receipts[1].result.expectOk().expectBool(true);
    block.receipts[2].result.expectOk().expectBool(true);
    block.receipts[3].result.expectErr().expectUint(404);
  },
});

Clarinet.test({
  name: "Ensure that the buyer can release pending balance to the seller",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    let deployer = accounts.get("deployer")!;
    let wallet_1 = accounts.get("wallet_1")!;
    let wallet_2 = accounts.get("wallet_2")!;
    let block = chain.mineBlock([
      createGenuine(3, "sample-metadata-uri", wallet_1.address),
      listInUstx(1, 50_000_000, wallet_1.address),
      buyInUstx(1, wallet_2.address),
      releaseGenuine(1, wallet_1.address),
      releaseUstxToSeller(1, wallet_2.address),
    ]);
    block.receipts[0].result.expectOk().expectUint(1);
    block.receipts[1].result.expectOk().expectBool(true);
    block.receipts[2].result.expectOk().expectBool(true);
    block.receipts[3].result.expectOk().expectUint(1);
    block.receipts[4].result.expectOk().expectBool(true);

    let stxEventReleaseUstx = block.receipts[4].events[0];

    assertEquals(stxEventReleaseUstx.stx_transfer_event.amount, "50000000");
    assertEquals(
      stxEventReleaseUstx.stx_transfer_event.recipient,
      wallet_1.address
    );
  },
});

Clarinet.test({
  name: "Ensure that new owner can buy a license for their NFT",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    let deployer = accounts.get("deployer")!;
    let wallet_1 = accounts.get("wallet_1")!;
    let wallet_2 = accounts.get("wallet_2")!;
    let wallet_9 = accounts.get("wallet_9")!;
    let block = chain.mineBlock([
      createGenuine(3, "sample-metadata-uri", wallet_1.address),
      listInUstx(1, 50_000_000, wallet_1.address),
      buyInUstx(1, wallet_2.address),
      releaseGenuine(1, wallet_1.address),
      releaseUstxToSeller(1, wallet_2.address),
      buyLicenseInUstx(1, wallet_2.address),
    ]);
    block.receipts[0].result.expectOk().expectUint(1);
    block.receipts[1].result.expectOk().expectBool(true);
    block.receipts[2].result.expectOk().expectBool(true);
    block.receipts[3].result.expectOk().expectUint(1);
    block.receipts[4].result.expectOk().expectBool(true);
    block.receipts[5].result.expectOk().expectBool(true);

    let stxEventBuyLicense = block.receipts[5].events[0];

    assertEquals(stxEventBuyLicense.stx_transfer_event.amount, "20000000");
    assertEquals(
      stxEventBuyLicense.stx_transfer_event.recipient,
      wallet_9.address
    );
  },
});


Clarinet.test({
  name: "Ensure that author can't buy a license for their nft",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    let deployer = accounts.get("deployer")!;
    let wallet_1 = accounts.get("wallet_1")!;
    let block = chain.mineBlock([
      createGenuine(3, "sample-metadata-uri", wallet_1.address),
      buyLicenseInUstx(1, wallet_1.address),
    ]);
    block.receipts[0].result.expectOk().expectUint(1);
    block.receipts[1].result.expectErr().expectUint(403);
  },
});

Clarinet.test({
  name: "Ensure that new owner cannot buy a license for NFTs with level 1 licensing",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    let deployer = accounts.get("deployer")!;
    let wallet_1 = accounts.get("wallet_1")!;
    let wallet_2 = accounts.get("wallet_2")!;
    let block = chain.mineBlock([
      createGenuine(1, "sample-metadata-uri", wallet_1.address),
      listInUstx(1, 50_000_000, wallet_1.address),
      buyInUstx(1, wallet_2.address),
      releaseGenuine(1, wallet_1.address),
      releaseUstxToSeller(1, wallet_2.address),
      buyLicenseInUstx(1, wallet_2.address),
    ]);
    block.receipts[0].result.expectOk().expectUint(1);
    block.receipts[1].result.expectOk().expectBool(true);
    block.receipts[2].result.expectOk().expectBool(true);
    block.receipts[3].result.expectOk().expectUint(1);
    block.receipts[4].result.expectOk().expectBool(true);
    block.receipts[5].result.expectErr().expectUint(400);
  },
});

Clarinet.test({
  name: "Ensure that new owner can buy a renewal for their NFT's license",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    let deployer = accounts.get("deployer")!;
    let wallet_1 = accounts.get("wallet_1")!;
    let wallet_2 = accounts.get("wallet_2")!;
    let wallet_9 = accounts.get("wallet_9")!;
    let block = chain.mineBlock([
      createGenuine(3, "sample-metadata-uri", wallet_1.address),
      listInUstx(1, 50_000_000, wallet_1.address),
      buyInUstx(1, wallet_2.address),
      releaseGenuine(1, wallet_1.address),
      releaseUstxToSeller(1, wallet_2.address),
      buyLicenseInUstx(1, wallet_2.address),
      renewLicenseInUstx(1, wallet_2.address),
    ]);
    block.receipts[0].result.expectOk().expectUint(1);
    block.receipts[1].result.expectOk().expectBool(true);
    block.receipts[2].result.expectOk().expectBool(true);
    block.receipts[3].result.expectOk().expectUint(1);
    block.receipts[4].result.expectOk().expectBool(true);
    block.receipts[5].result.expectOk().expectBool(true);
    block.receipts[6].result.expectOk().expectBool(true);

    let stxEventRenewLicense = block.receipts[6].events[0];

    assertEquals(stxEventRenewLicense.stx_transfer_event.amount, "20000000");
    assertEquals(
      stxEventRenewLicense.stx_transfer_event.recipient,
      wallet_9.address
    );
  },
});

Clarinet.test({
  name: "Ensure that new owner cannot buy a renewal for NFTs without an existing license",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    let deployer = accounts.get("deployer")!;
    let wallet_1 = accounts.get("wallet_1")!;
    let wallet_2 = accounts.get("wallet_2")!;
    let block = chain.mineBlock([
      createGenuine(3, "sample-metadata-uri", wallet_1.address),
      listInUstx(1, 50_000_000, wallet_1.address),
      buyInUstx(1, wallet_2.address),
      releaseGenuine(1, wallet_1.address),
      releaseUstxToSeller(1, wallet_2.address),
      renewLicenseInUstx(1, wallet_2.address),
    ]);
    block.receipts[0].result.expectOk().expectUint(1);
    block.receipts[1].result.expectOk().expectBool(true);
    block.receipts[2].result.expectOk().expectBool(true);
    block.receipts[3].result.expectOk().expectUint(1);
    block.receipts[4].result.expectOk().expectBool(true);
    block.receipts[5].result.expectErr().expectUint(404);
  },
});

Clarinet.test({
  name: "Ensure that new owner can buy a new license only if license has expired",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    let deployer = accounts.get("deployer")!;
    let wallet_1 = accounts.get("wallet_1")!;
    let wallet_2 = accounts.get("wallet_2")!;
    let block = chain.mineBlock([
      createGenuine(3, "sample-metadata-uri", wallet_1.address),
      listInUstx(1, 50_000_000, wallet_1.address),
      buyInUstx(1, wallet_2.address),
      releaseGenuine(1, wallet_1.address),
      releaseUstxToSeller(1, wallet_2.address),
      buyLicenseInUstx(1, wallet_2.address),
      buyLicenseInUstx(1, wallet_2.address),
    ]);
    block.receipts[0].result.expectOk().expectUint(1);
    block.receipts[1].result.expectOk().expectBool(true);
    block.receipts[2].result.expectOk().expectBool(true);
    block.receipts[3].result.expectOk().expectUint(1);
    block.receipts[4].result.expectOk().expectBool(true);
    block.receipts[5].result.expectOk().expectBool(true);
    // license not yet expired
    block.receipts[6].result.expectErr().expectUint(409);

    /* clarinet does not allow to specify a block-info
    chain.mineEmptyBlock(1000000)
    block = chain.mineBlock([      
      buyLicenseInUstx(1, wallet_2.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    */
  },
});