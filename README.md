# smartists-smart-contract
### Test on clarinet
https://www.hiro.so/clarinet

run ```clarinet test```

## Contract Sequence and guide
Note: NFT with license level 1 cannot be licensed. Level 2 and 3 are available for licensing.
```
1. Mint genuine (use Author address)
    (create-genuine (level uint) (metadata-uri (string-ascii 255))

    Example: (contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.genuine create-genuine u3 "sample-uri-string")
    Result : (ok genuine-id)
    
2. List genuine (use Author address)
    (list-in-ustx (genuine-id uint) (price uint))

    Example: (contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.genuine list-in-ustx u1 u30)
    Result : (ok true)
    
3. Buy listed genuine (use Buyer address)
    (buy-in-ustx (genuine-id uint) (public-key (string-ascii 80)))

    Example: (contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.genuine buy-in-ustx u1 "public key")
    Result : (ok true)
    
4. Release genuine (use Author address)
    (release-genuine (genuine-id uint))

    Example: (contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.genuine release-genuine u1)
    Result : (ok pending-balance-id)

5. Release ustx to seller (use Buyer address)
    (release-ustx-to-seller (pending-balance-id uint))

    Example: (contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.genuine release-ustx-to-seller u1)

    Result : (ok true)
    
6. Buy license (use Buyer address)
    (buy-license-in-ustx (genuine-id uint))

    Example: (contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.genuine buy-license-in-ustx u1)
    Result : (ok true)

6. Renew license (use Buyer address)
    (renew-license-in-ustx (genuine-id uint))

    Example: (contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.genuine renew-license-in-ustx u1)
    Result : (ok true)
```







