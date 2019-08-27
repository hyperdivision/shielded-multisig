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
  tweak (tweakData) {
    assert(tweakData.id.byteLength === 32, 'tweakData.id must be 32 bytes')
    assert(typeof tweakData.counter === 'number', 'tweakData.counter must be a number')
    assert(tweakData.counter === (tweakData.counter >>> 0), 'tweakData.counter must be a uint32')
    assert(typeof tweakData.threshold === 'number', 'tweakData.threshold must be a number')
    assert(tweakData.threshold === (tweakData.threshold & 0xff >>> 0), 'tweakData.threshold must be a uint8')
    assert(tweakData.nonce.byteLength === 32, 'tweakData.nonce must be 32 bytes')

    const output = Buffer.alloc(32)
    const state = Buffer.alloc(32 + 4 + 1)
    state.set(tweakData.id, 0)
    state.writeUInt32LE(tweakData.counter, 0 + 32)
    state.writeUInt8(tweakData.threshold, 0 + 32 + 4)

    sodium.crypto_generichash(output, state, tweakData.nonce)
    return output
  },

  tweakPublic (tweakData, publicKey) {
    return curve.publicKeyTweakMul(publicKey, this.tweak(tweakData))
  },

  tweakPrivate (tweakData, secretKey) {
    return curve.privateKeyTweakMul(secretKey, this.tweak(tweakData))
  }
}
