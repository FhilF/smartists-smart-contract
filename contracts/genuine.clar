(impl-trait .nft-trait.nft-trait)

;; constants
(define-non-fungible-token Genuine uint)

;; data maps and vars
(define-data-var last-id uint u0)
(define-data-var last-pending-balance-id uint u0)
(define-data-var licensing-fee uint u0)

(define-map genuine-metadata uint
  {metadata-uri: (string-ascii 256), author: principal, level: uint, created-at: uint}
)

(define-map license-level uint
  {rights-granted: (tuple (display bool) (copy bool) (adapt bool) (distribution bool)), price: uint}
)

(define-map license uint
  {level: uint, expire-at: uint, created-at: uint, updated-at: uint, licensee: principal, author: principal}
)

(define-map market-item uint
  {price: uint, owner: principal}
)

(define-map pending-sale uint
  {price: uint, owner: principal, new-owner: principal}
)

(define-map pending-balance uint
  {genuine-id: uint, balance: uint, unlocked-at: uint, seller: principal, new-owner: principal}
)

(define-map last-owner uint principal)

(define-constant YEAR-IN-DAYS u365)
(define-constant DAY-IN-SECONDS u86400)
(define-constant WALLET_1 'STNHKEPYEPJ8ET55ZZ0M5A34J0R3N5FM2CMMMAZ6)

(define-constant ERR-BAD-REQUEST u400)
(define-constant ERR-NOT-AUTHORIZED u403)
(define-constant ERR-NOT-FOUND u404)
(define-constant ERR-ALREADY-EXIST u409)

(define-constant ERR-ON-LISTING u505)
(define-constant ERR-ALREADY-EXPIRED u506)

(define-constant ERR-FATAL u999)

(define-read-only (get-timestamp)
   (unwrap-panic (get-block-info? time (- block-height u1))))

;; private functions
(define-private (is-sender-owner (genuine-id uint))
  (let ((owner (unwrap! (nft-get-owner? Genuine genuine-id) false)))
    (is-eq tx-sender owner)))

(define-private (is-sender-author (genuine-id uint))
  (let ((metadata (unwrap! (map-get? genuine-metadata genuine-id) false)))
    (is-eq tx-sender (get author metadata))))

(define-private (is-license-level-valid (level uint))
  (is-some (map-get? license-level level)))

;; public functions
(define-public (create-genuine (level uint) (metadata-uri (string-ascii 255)))
  (let ((genuine-id (+ u1 (var-get last-id))))
    (asserts! (is-license-level-valid level) (err ERR-BAD-REQUEST))
    (match (nft-mint? Genuine genuine-id tx-sender)
      success (begin 
        (var-set last-id genuine-id)
        (map-set genuine-metadata genuine-id
        {
          level: level,
          metadata-uri: metadata-uri,
          author: tx-sender,
          created-at: (get-timestamp)
        })
        (print {action: "create-genuine", id: genuine-id, level: level})
        (ok genuine-id)
      )
      error (err (* u1000 error)))))

(define-public (transfer (genuine-id uint) (sender principal) (recipient principal))
  (begin
    (asserts! (is-eq sender tx-sender) (err ERR-NOT-AUTHORIZED))
    (asserts! (is-none (map-get? market-item genuine-id)) (err ERR-ON-LISTING))
    (match (nft-transfer? Genuine genuine-id sender recipient)
    success (
      begin
        (map-set last-owner genuine-id tx-sender)
        (map-delete license genuine-id)
        (ok true)
      )
    error (err error))))

;;
;; market functions
;;

(define-public (list-in-ustx (genuine-id uint) (price uint))
  (let ((listing {owner: tx-sender, price: price })) 
    (asserts! (is-sender-owner genuine-id) (err ERR-NOT-AUTHORIZED))
    (map-set market-item genuine-id listing)
    (print (merge listing {action: "list-in-ustx", id: genuine-id}))
    (ok true)))

(define-public (unlist-in-ustx (genuine-id uint))
  (begin
    (asserts! (is-sender-owner genuine-id) (err ERR-NOT-AUTHORIZED))
    (map-delete market-item genuine-id)
    (print {action: "unlist-in-ustx", id: genuine-id})
    (ok true)))

(define-public (buy-in-ustx (genuine-id uint))
  (let (
      (listing (unwrap! (map-get? market-item genuine-id) (err ERR-NOT-FOUND)))
    )
    (asserts! (not (is-eq tx-sender (get owner listing))) (err ERR-NOT-AUTHORIZED))
    (try! (stx-transfer? (get price listing) tx-sender (as-contract tx-sender)))
    (try! (nft-transfer? Genuine genuine-id (get owner listing) (as-contract tx-sender)))
    (map-delete market-item genuine-id)
    (map-set pending-sale genuine-id (merge listing {new-owner: tx-sender}))
    (print {action: "buy-in-ustx", id: genuine-id})
    (ok true)))

(define-public (release-genuine (genuine-id uint))
  (let (
      (pending-sale-details (unwrap! (map-get? pending-sale genuine-id) (err ERR-NOT-FOUND)))
      (pending-balance-id (+ u1 (var-get last-pending-balance-id)))
    )
      (var-set last-pending-balance-id pending-balance-id)
      (asserts! (is-eq (get owner pending-sale-details) tx-sender) (err ERR-NOT-AUTHORIZED))
      (try! (as-contract (nft-transfer? Genuine genuine-id tx-sender (get new-owner pending-sale-details))))
      (map-set pending-balance pending-balance-id {genuine-id: genuine-id, balance: (get price pending-sale-details), unlocked-at: (+ (get-timestamp) (* u1 DAY-IN-SECONDS)), seller: tx-sender, new-owner: (get new-owner pending-sale-details)})
      (map-set last-owner genuine-id (get owner pending-sale-details))
      (map-delete license genuine-id)
      (map-delete pending-sale genuine-id)
      (print {action: "release-genuine", id: genuine-id, pending-balance-id: pending-balance-id })
      (ok pending-balance-id)))

;;Release pending balance to self (Seller POV)
;;note: Unlocked after dispute time (1 day)
(define-public (release-ustx-seller (pending-balance-id uint))
  (let (
    (pending-balance-details (unwrap! (map-get? pending-balance pending-balance-id) (err ERR-NOT-FOUND)))
  )
    (asserts! (is-eq (get seller pending-balance-details) tx-sender) (err ERR-NOT-AUTHORIZED))
    (asserts! (<= (get unlocked-at pending-balance-details) (get-timestamp)) (err ERR-NOT-AUTHORIZED))
    (try! (as-contract (stx-transfer? (get balance pending-balance-details) tx-sender (get seller pending-balance-details))))
    (map-delete pending-balance pending-balance-id)
    (ok true)))

;;Release pending balance to seller (Buyer POV)
(define-public (release-ustx-to-seller (pending-balance-id uint))
  (let (
    (pending-balance-details (unwrap! (map-get? pending-balance pending-balance-id) (err ERR-NOT-FOUND)))
  )
    (asserts! (is-eq (get new-owner pending-balance-details) tx-sender) (err ERR-NOT-AUTHORIZED))
    (try! (as-contract (stx-transfer? (get balance pending-balance-details) tx-sender (get seller pending-balance-details))))
    (map-delete pending-balance pending-balance-id)
    (ok true)))

;;
;; license functions
;;

;; user that own the NFT can buy a licence for 1 year
;; if the NFT has license-level > 1 and it has no existing license or its already expired.
(define-public (buy-license-in-ustx (genuine-id uint))
  (let (
    (genuine-details (unwrap! (map-get? genuine-metadata genuine-id) (err ERR-NOT-FOUND)))
    (genuine-license-level (get level genuine-details))
    (license-level-details (unwrap-panic (map-get? license-level genuine-license-level)))
    (timestamp (get-timestamp))
    (years u1)
    (new-license-details {level: genuine-license-level, created-at: timestamp, expire-at: (+ timestamp (* years (* YEAR-IN-DAYS DAY-IN-SECONDS))), updated-at: timestamp, licensee: tx-sender, author: (get author genuine-details)})
    (existing-license (map-get? license genuine-id))
  )
    (asserts! (not (is-eq genuine-license-level u1)) (err ERR-BAD-REQUEST))
    (asserts! (is-sender-owner genuine-id) (err ERR-NOT-AUTHORIZED))
    (asserts! (or (is-none existing-license) (> timestamp (get expire-at (unwrap! existing-license (err ERR-FATAL))))) (err ERR-ALREADY-EXIST))
    (try! (pay-license genuine-id years (get price license-level-details)))
    (map-set license genuine-id new-license-details)
    (print (merge new-license-details {action: "buy-license-in-ustx", id: genuine-id}))
    (ok true)))

;; user that own the NFT can renew a licence for 1 year
;; if the NFT has license-level > 1 and it has existing license and it hasn't expired.
(define-public (renew-license-in-ustx (genuine-id uint))
  (let (
    (genuine-details (unwrap! (map-get? genuine-metadata genuine-id) (err ERR-NOT-FOUND)))
    (genuine-license-level (get level genuine-details))
    (license-level-details (unwrap-panic (map-get? license-level genuine-license-level)))
    (timestamp (get-timestamp))
    (years u1)
    (license-details (unwrap! (map-get? license genuine-id) (err ERR-NOT-FOUND)))
    (new-license-details (merge license-details {expire-at: (+ (get expire-at license-details) (* years (* YEAR-IN-DAYS DAY-IN-SECONDS))), updated-at: timestamp}))
  )
    (asserts! (not (is-eq genuine-license-level u1)) (err ERR-BAD-REQUEST))
    (asserts! (< timestamp (get expire-at license-details)) (err ERR-ALREADY-EXPIRED))
    (asserts! (is-sender-owner genuine-id) (err ERR-NOT-AUTHORIZED))
    (try! (pay-license genuine-id years (get price license-level-details)))
    (map-set license genuine-id new-license-details)
    (print (merge new-license-details {action: "renew-license-in-ustx", id: genuine-id}))
    (ok true)))

(define-private (pay-license (genuine-id uint) (years uint) (price-per-year uint ))
  (begin
    (asserts! (not (is-sender-author genuine-id)) (err ERR-NOT-AUTHORIZED))
    (asserts! (is-none (map-get? market-item genuine-id)) (err ERR-ON-LISTING))
    (stx-transfer? (* years price-per-year) tx-sender WALLET_1)))
    
(define-read-only (get-last-token-id)
  (ok (var-get last-id)))

(define-read-only (get-token-uri (genuine-id uint))
  (match (map-get? genuine-metadata genuine-id)
    metadata (ok (some (get metadata-uri metadata)))
    (ok none)))

(define-public (get-owner (index uint))
  (ok (nft-get-owner? Genuine index)))


(define-read-only (get-metadata (genuine-id uint))
  (map-get? genuine-metadata genuine-id))

(define-read-only (get-last-owner (genuine-id uint))
  (map-get? last-owner genuine-id))

(define-read-only (get-pending-sale-details (genuine-id uint))
  (map-get? pending-sale genuine-id))

(define-read-only (get-last-pending-balance-id)
  (var-get last-pending-balance-id))

(define-read-only (verify-license-level (level uint))
  (is-license-level-valid level))

(define-read-only (get-license-level-details (level uint))
  (map-get? license-level level))

(define-read-only (get-listing-details (genuine-id uint))
  (map-get? market-item genuine-id))

(define-read-only (get-genuine-license-details (genuine-id uint))
  (map-get? license genuine-id))

(define-read-only (get-pending-balance-details (pending-balance-id uint))
  (map-get? pending-balance pending-balance-id))

(map-insert license-level u1 {rights-granted: (tuple (display true) (copy false) (adapt false) (distribution false)), price: u5000000})
(map-insert license-level u2 {rights-granted: (tuple (display true) (copy true) (adapt false) (distribution false)), price: u10000000})
(map-insert license-level u3 {rights-granted: (tuple (display true) (copy true) (adapt true) (distribution false)), price: u20000000})
;; (map-insert license-level u4 {rights-granted: (tuple (display true) (copy true) (adapt false) (distribution true)), price: u0})
;; (map-insert license-level u5 {rights-granted: (tuple (display true) (copy true) (adapt true) (distribution true)), price: u0})
