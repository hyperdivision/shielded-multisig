const curve = require('secp256k1')
const algorithm = require('./tweak')
const script = require('./script')
const sodium = require('sodium-native')
const assert = require('nanoassert')

function validateMasterkeys (masterKeys) {
  return masterKeys.every(k => Buffer.isBuffer(k) && curve.publicKeyVerify(k))
}

function address (data, masterKeys, threshold) {
  const { tweakData, script } = redeemScript(data, masterKeys, threshold)

  return {
    tweakData,
    address: script.computeNestedAddress(script)
  }
}

function redeemScript ({ id, counter }, masterKeys, threshold) {
  const m = threshold
  const n = masterKeys.length

  // Nonce is the sorted hash of master keys. This is made deterministic such
  // that if the tweak is lost it can easily be brute-forced from known values
  const nonce = Buffer.alloc(32)
  sodium.crypto_generichash_batch(nonce, masterKeys.sort(Buffer.compare))

  const tweakData = {
    id: id,
    counter: counter,
    threshold,
    nonce
  }

  // recurse in case we get a bad derived key. Will happen very rarely, so
  // it will not exhaust the stack
  try {
    var derivedKeys = masterKeys.map(k => algorithm.tweakPublic(tweakData, k))
  } catch (ex) {
    console.error(ex)
    if (ex.name === 'AssertionError') throw ex
    tweakData.counter++
    assert(tweakData.counter === (tweakData.counter & 0xffffffff), 'tweakData.counter overflowed 32-bits')
    return redeemScript(tweakData, masterKeys, threshold)
  }

  return {
    tweakData,
    // Will generate a new Multisig script
    script: script.fromMultisig(m, n, derivedKeys)
  }
}

module.exports = {
  address,
  redeemScript,
  validateMasterkeys
}
