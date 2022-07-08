import { Chain, Tx, types, Account } from "./deps.ts";

export function createGenuine(
  level: number,
  metadataUri: string,
  userAddress: string
) {
  return Tx.contractCall(
    "genuine",
    "create-genuine",
    [types.uint(level), types.ascii(metadataUri)],
    userAddress
  );
}

export function transfer(
  id: number,
  senderAddress: string,
  recipientAddress: string,
  userAddress?: string
) {
  return Tx.contractCall(
    "genuine",
    "transfer",
    [
      types.uint(id),
      types.principal(senderAddress),
      types.principal(recipientAddress),
    ],
    userAddress ? userAddress : senderAddress
  );
}

export function listInUstx(id: number, price: number, userAddress: string) {
  return Tx.contractCall(
    "genuine",
    "list-in-ustx",
    [types.uint(id), types.uint(price)],
    userAddress
  );
}

export function unlistInUstx(id: number, userAddress: string) {
  return Tx.contractCall(
    "genuine",
    "unlist-in-ustx",
    [types.uint(id)],
    userAddress
  );
}

export function buyInUstx(id: number, userAddress: string) {
  return Tx.contractCall(
    "genuine",
    "buy-in-ustx",
    [types.uint(id)],
    userAddress
  );
}

export function releaseGenuine(id: number, userAddress: string) {
  return Tx.contractCall(
    "genuine",
    "release-genuine",
    [types.uint(id)],
    userAddress
  );
}

export function releaseUstxToSeller(id: number, userAddress: string) {
  return Tx.contractCall(
    "genuine",
    "release-ustx-to-seller",
    [types.uint(id)],
    userAddress
  );
}

export function buyLicenseInUstx(id: number, userAddress: string) {
  return Tx.contractCall(
    "genuine",
    "buy-license-in-ustx",
    [types.uint(id)],
    userAddress
  );
}

export function renewLicenseInUstx(id: number, userAddress: string) {
  return Tx.contractCall(
    "genuine",
    "renew-license-in-ustx",
    [types.uint(id)],
    userAddress
  );
}

export function getTimestamp(chain: Chain, userAddress: string) {
  return chain.callReadOnlyFn("genuine", "get-timestamp", [], userAddress);
}
