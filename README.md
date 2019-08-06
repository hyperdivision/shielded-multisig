# `@hyperdivision/shielded-multisig`

[![Build Status](https://travis-ci.com/hyperdivision/vhs-tape.svg?branch=master)](https://travis-ci.com/hyperdivision/vhs-tape)

> Shielded Bitcoin Multisig using Public Key Tweaking

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

// Id must be 32 byte integer. Could also be a 256 bit hash of some user string
const id = Buffer.alloc(32)
id.writeUInt32LE(1) // Just use the Uint32LE value of `1`

// Save the tweak somewhere, and give out the hash. The `counter` may be
// incremented internally if a specific value causes an invalid tweaked key
const { tweak, address } = shield.address({ id, counter: 0 }, masterKeys, threshold)

// deepEqual(tweakS, tweak) === true
const { tweak: tweakS, script } = shield.redeemScript(tweak, masterKeys, threshold)
```

Signing:

```js
const shield = require('@hyperdivision/shielded-multisig')
const { tweakPrivate } = require('@hyperdivision/shielded-multisig/tweak')

const threshold = 2
const masterKeys = [
  Buffer.from('...', 'hex'),
  Buffer.from('...', 'hex'),
  Buffer.from('...', 'hex')
]

const tweak = { /* ... */ }
const { script } = shield.redeemScript(tweak, masterKeys, threshold)

const privateKey = Buffer.from('...', 'hex')

// bcoin part
const { MTX, KeyRing } = require('bcoin')
const spend = MTX.fromJSON(/* transaction data */)

const ring = KeyRing.fromPrivate(tweakPrivate(tweak, privateKey))
ring.witness = true
ring.script = script

var signed = spend.sign(ring)
if (signed !== spend.inputs.length) throw new Error('Did not sign all inputs')

// now spend is signed
```

## API

### `const { tweak, address } = shield.address(userInfo, masterKeys, threshold)`

### `const { tweak, script } = shield.redeemScript(userInfo, masterKeys, threshold)`

### `const tweak = tweak.tweak(userInfo)`

### `const tweak = tweak.tweakPublic(userInfo, publicKey)`

### `const tweak = tweak.tweakPrivate(userInfo, privateKey)`

## Install

```sh
npm install @hyperdivision/shielded-multisig
```

## License

[ISC](LICENSE)
