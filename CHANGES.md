# Changes & Fixes

## Critical Security — Remote Code Execution (RCE) Backdoor

**Files:** `server/middleware/errorHandler.js`, `server/controllers/auth.controller.js`, `server/config/config.js`

A supply chain attack was embedded across three files:

1. `config.js` contained a `publicKey` field with a base64-encoded external URL
2. `auth.controller.js` fetched code from that URL on module load via `axios.get(atob(publicKey))`
3. `errorHandler.js` used `new Function.constructor("require", errCode)` to execute the fetched code with full Node.js `require()` access

**Fix:** Removed the malicious `publicKey`, removed the axios fetch, and replaced the `errorHandler` with a standard Express error middleware.

---

## Backend Fixes (Node.js)

| #   | File                                                        | Bug                                                                                                | Fix                                                          |
| --- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| 1   | `server/app.js`                                             | `body-parser` imported but `express.json()` never called — all POST/PUT bodies are `undefined`     | Added `express.json()` and `express.urlencoded()` middleware |
| 2   | `server/controllers/auth.controller.js`                     | `users = new userM()` — implicit global variable                                                   | Changed to `const user = new userM()`                        |
| 3   | `server/controllers/auth.controller.js`                     | `req.body.lName` — field name doesn't match model's `lname`                                        | Changed to `req.body.lname`                                  |
| 4   | `server/controllers/common.controller.js`                   | 5 handlers missing `else` after error checks → sends two responses → `ERR_HTTP_HEADERS_SENT` crash | Added `else` before success responses                        |
| 5   | `server/controllers/common.controller.js`                   | `city_model.remove()` — deprecated Mongoose API                                                    | Changed to `deleteOne()`                                     |
| 6   | `server/controllers/property.controller.js`                 | `Property.update()` and `result.nModified` — deprecated                                            | Changed to `updateOne()` and `result.modifiedCount`          |
| 7   | `server/models/users.js`                                    | `userSchema = ...` — implicit global                                                               | Changed to `const userSchema`                                |
| 8   | `server/models/users.js`, `propertyTypes.js`, `property.js` | `default: Date.now()` — executes at module load, all documents get same timestamp                  | Changed to `default: Date.now` (reference, not invocation)   |
| 9   | `server/models/propertyTypes.js`                            | `propertyTypesSchema = ...` — implicit global                                                      | Changed to `const propertyTypesSchema`                       |
| 10  | `server/providers/helper.js`                                | `for (element of ...)` — implicit global                                                           | Changed to `for (const element of ...)`                      |
| 11  | `server/providers/token.provider.js`                        | JWT signed with `RS256` algorithm using a string secret (requires RSA key pair)                    | Changed to `HS256` (HMAC with SHA-256)                       |
| 12  | `server/routes/property.js`                                 | `mongoose.mongo.GridFsStorage` — class doesn't exist                                               | Changed to `mongoose.mongo.GridFSBucket`                     |

---

## Smart Contract Fixes (Solidity)

### HomeTransaction.sol

| #   | Bug                                                                          | Impact                                                                                                         | Fix                                                                                                                |
| --- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| 1   | `sellerSignContract()` marked `payable`                                      | ETH sent by seller gets permanently locked                                                                     | Removed `payable` modifier                                                                                         |
| 2   | `buyerFinalizeTransaction()` has no deadline check                           | Buyer can finalize after deadline (after seller already withdrew deposit)                                      | Added `require(now <= finalizeDeadline)`                                                                           |
| 3   | `anyWithdrawFromTransaction()` allows any address to withdraw after deadline | Anyone can steal the deposit                                                                                   | Split into `buyerWithdrawFromTransaction()` and `sellerWithdrawAfterDeadline()` with role-based access control     |
| 4   | `deposit - realtorFee` can underflow                                         | If 10% deposit < realtorFee → integer underflow                                                                | Added conditional check before subtraction                                                                         |
| 5   | No events emitted for state changes                                          | No off-chain tracking/indexing possible                                                                        | Added 5 events: `ContractSigned`, `DepositPaid`, `ClosingReviewed`, `TransactionFinalized`, `TransactionWithdrawn` |
| 6   | `msg.value + deposit == price` in `buyerFinalizeTransaction()`               | **Arithmetic overflow** — in Solidity <0.8, attacker can craft `msg.value` so addition wraps around to `price` | Changed to `msg.value == price - deposit` (safe since `deposit <= price`)                                          |
| 7   | Constructor doesn't validate addresses                                       | If `address(0)` passed for realtor/seller/buyer, `transfer()` burns ETH permanently                            | Added `require(addr != address(0))` for all three roles                                                            |
| 8   | Constructor allows `price = 0`                                               | Creates a no-op contract with 0 deposit and 0 transfers                                                        | Added `require(_price > 0)`                                                                                        |
| 9   | **Stuck state**: `WaitingRealtorReview` has no timeout                       | If realtor disappears, buyer's deposit is **locked forever** — no escape hatch                                 | Added `realtorReviewDeadline` (30 min) + `buyerWithdrawFromRealtorReview()`                                        |
| 10  | Constructor allows same address for buyer/seller/realtor                     | Same person controls multiple roles → can manipulate transaction                                               | Added `require(roles are different addresses)`                                                                     |
| 11  | `pragma solidity >=0.4.25` allows Solidity 0.4.x                            | Code uses `address payable` and `constructor` which require `>=0.5.0` — **won't compile on 0.4.x**            | Tightened pragma to `>=0.5.0 <0.6.0`                                                                               |

### Factory.sol

| #   | Bug                           | Fix                           |
| --- | ----------------------------- | ----------------------------- |
| 1   | No event on contract creation | Added `ContractCreated` event |
| 2   | `pragma solidity >=0.4.25` allows compilation with 0.4.x | Code uses `address payable` (requires 0.5+) | Tightened to `>=0.5.0 <0.6.0` |

---

## Tests Added

Created 4 test suites in `server/__tests__/` with 13 tests:

- **errorHandler.test.js** — Verifies proper error responses and confirms RCE vulnerability is removed
- **config.test.js** — Validates required config fields and confirms malicious `publicKey` is removed
- **token.provider.test.js** — Verifies HS256 works and RS256 with string secret correctly fails
- **helper.test.js** — Tests `isKeyMissing` utility for key validation

Run tests: `npx jest server/__tests__/ --verbose`
