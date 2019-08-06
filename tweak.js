const curve = require('secp256k1')
const sodium = require('sodium-native')
const assert = require('nanoassert')

// Generate addresses using the following scheme:
//
// Independent keys are generated as [x]G
//  where   x is a random scalar in the field
//          G is a generator of the group
//          [·] is scalar multiplication
//
// Tweaks are encoded as H(id || counter || theshold, key = nonce) using a keyed
// hash which is blake2b in this case. id is a 32 byte buffer, counter is
// 32 bit // unsigned integer encoded as little endian and theshold is a single
// byte. The key is a 32 byte nonce.
//
// A derived public key is then [H(·) * x]G, but since scalar multiplication is
// commutative and associative, it is the same as [H(·)][x]G, so master keys
// do not have to reveal their private key. Using multiplication should also
// make this decisional Diffie-Hellman.
//
// Private keys can be computed as H(·) * x and used for signing
module.exports = {
  tweak (data) {
    assert(data.id.byteLength === 32, 'data.nonce must be 32 bytes')
    assert(typeof data.counter === 'number', 'data.counter must be a number')
    assert(data.counter === (data.counter >>> 0), 'data.counter must be a uint32')
    assert(typeof data.threshold === 'number', 'data.threshold must be a number')
    assert(data.threshold === (data.threshold & 0xff >>> 0), 'data.threshold must be a uint8')
    assert(data.nonce.byteLength === 32, 'data.nonce must be 32 bytes')

    const output = Buffer.alloc(32)
    const state = Buffer.alloc(32 + 4 + 1)
    state.set(data.id, 0)
    state.writeUInt32LE(data.counter, 0 + 32)
    state.writeUInt8(data.threshold, 0 + 32 + 4)

    sodium.crypto_generichash(output, state, data.nonce)
    return output
  },

  tweakPublic (data, publicKey) {
    return curve.publicKeyTweakMul(publicKey, this.tweak(data))
  },

  tweakPrivate (data, secretKey) {
    return curve.privateKeyTweakMul(secretKey, this.tweak(data))
  }
}
