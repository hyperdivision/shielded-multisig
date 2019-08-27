# `@hyperdivision/shielded-multisig`

[![Build Status](https://travis-ci.com/hyperdivision/vhs-tape.svg?branch=master)](https://travis-ci.com/hyperdivision/vhs-tape)

> Shielded Bitcoin Multisig using Public Key Tweaking

Create multisig wallets based on a set of public keys without access to secret
keys or revealing public keys.

## Usage

```js
const shield = require('@hyperdivision/shielded-multisig')

// secp256k1 master keys used to redeem. Here we construct a 2-of-3 address
const threshold = 2
const masterKeys = [
  Buffer.from('...', 'hex'),
  Buffer.from('...', 'hex'),
  Buffer.from('...', 'hex')
]

// id must be 32-byte Buffer.
// Could for example be a 256 bit hash of some user string
const id = Buffer.alloc(32)
id.writeUInt32LE(1) // Just use the Uint32LE value of `1` for this example

// Save the tweak somewhere, and give out the hash. The `counter` may be
// incremented internally if a specific value causes an invalid tweaked key
const { tweakData, address } = shield.address({ id, counter: 0 }, masterKeys, threshold)

// deepEqual(tweakDataS, tweakData) === true
const { tweakData: tweakDataS, script } = shield.redeemScript(tweakData, masterKeys, threshold)
```

Signing using `bcoin`:

```js
const shield = require('@hyperdivision/shielded-multisig')
const { tweakPrivate } = require('@hyperdivision/shielded-multisig/tweak')

const threshold = 2
const masterKeys = [
  Buffer.from('...', 'hex'),
  Buffer.from('...', 'hex'),
  Buffer.from('...', 'hex')
]

const { tweakData, script } = shield.redeemScript({ /* ... */ }, masterKeys, threshold)

const privateKey = Buffer.from('...', 'hex')

// bcoin part
const { MTX, KeyRing } = require('bcoin')
const spend = MTX.fromJSON(/* transaction data */)

const ring = KeyRing.fromPrivate(tweakPrivate(tweakData, privateKey))
ring.witness = true
ring.script = script

var signed = spend.sign(ring)
if (signed !== spend.inputs.length) throw new Error('Did not sign all inputs')

// now spend is signed
```

## API

### `const { tweakData, address } = shield.address({ id, counter }, masterKeys, threshold)`

Generate a new `address` from `{ id, counter }`, `masterKeys` and `threshold`.
The inputs uniquely and deterministically determine the `address`.

`id` must be a 32-byte `Buffer` and could be eg. a username, account number,
persisted random buffer or hash of some user information. The counter can be
used to generate multiple addresses for a single user or can be left at `0`.
Note that `tweakData` may return a counter different from the one passed, if
the details of the algorithm results in an invalid public key. This is extremely
rare, but do not rely on the passed counter actually being the one that is used.

`masterKeys` must be an array of valid `secp256k1` public keys encoded as
`Buffer`s. Threshold must be an integer less than or equal to the number of
master keys.

Returns a `tweakData` object, that you should persist for future use, and
`address` which is a `bcoin` `Address` of a `P2SH(P2WSH(m of n))` script that
can be encoded as desired.

### `const { tweakData, script } = shield.redeemScript({ id, counter }, masterKeys, threshold)`

Exactly the same as above, but return a `bcoin` `Script` instead of an `Address`.

### `const tweakedPublicKey = algorithm.tweakPublic(tweakData, publicKey)`

Low-level facility to compute the tweaked public key. Note that you must provide
the full `tweakData` as returned by the above functions. Returns a `Buffer`

### `const tweakedPrivateKey = algorithm.tweakPrivate(tweakData, privateKey)`

Low-level facility to compute the tweaked private key. Note that you must
provide the full `tweakData` as returned by the above functions. Returns a
`Buffer`

### `const tweak = algorithm.tweak(tweakData)`

Compute a non-reduced scalar from `tweakData` as a 32 byte Buffer. Used
internally by `tweakPublic` and `tweakPrivate`

## Algorithm

This module uses key tweaking based on Diffie-Hellman and hash functions.
A given master key pair is tweaked using a hash of `tweakData`, which works as
follows:

1. The `tweakData` is hashed using keyed BLAKE2b, as follows
`tweak = BLAKE2b-256( 32-byte id || U32LE(counter) || U8(threshold), key = nonce)`.
The `nonce` is computed as the hash of the set of master keys sorted
lexicographically, and then concatenated:
`nonce = BLAKE2b-256(CONCAT(SORT(masterKeys)))`
2. The tweaked key pair can now be computed as `PK' = [tweak]·PK` and
`SK' = tweak * SK`, where `[x]·E` denotes scalar multiplication of group element
`E` with scalar `x`, and `x * y` denotes field multiplication. The reason this
works is because `secp256k1` is a prime order group, so every element of the
group is a generator. Private/Secret keys are simply scalars over the finite
field, while public keys are `PK = [SK]·G`, where `G` is the predefined base
point of the group. However since any element of the group is a generator we can
use the public key as a generator for a new derived key. Since scalar
multiplication is associative, `[tweak]·[SK]·G = [tweak * SK]·G`, so we can
recover the derived private key when we need to sign with for the tweaked public
key, by applying our tweak to our private key.
3. If the above `[tweak]·PK` results in the invalid public key we increment the
counter from step 1 and try again.

## Install

```sh
npm install @hyperdivision/shielded-multisig
```

## License

[ISC](LICENSE)
