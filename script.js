const opcodes = require('./opcodes.json')
const assert = require('nanoassert')
const int = require('bitcoin-consensus-encoding').int
const crypto = require('crypto')
const base58 = require('bs58')
const sodium = require('sodium-native')

module.exports = {
  fromMultisig,
  computeNestedAddress
}

function fromMultisig (m , n, keys) {
  assert(keys.length === n, `${n} keys required for multisig.`)
  assert(m > 0 && m <= n)
  assert(n > 0 && n < 16)
  assert(Array.isArray(keys))

  const formatKeys = []
  let len = 0

  const sortKeys = keys.sort(Buffer.compare)
  for (let key of sortKeys) {
    formatKeys.push(format(key))
    len += format.bytes
  }

  const script = Buffer.alloc(3 + len)

  script[0] = opcodes[`OP_${m}`]
  script.set(Buffer.concat(formatKeys), 1)
  script[len + 1] = opcodes[`OP_${n}`]
  script[len + 2] = opcodes.OP_CHECKMULTISIG

  return script
}

function computeNestedAddress (script) {
  const scriptHash = sha256(script)
  const p2sh = fromProgram(0, scriptHash)

  return addressFromScript(p2sh)
}

function fromProgram (version, data) {
  assert((version & 0xff) === version && version >= 0 && version <= 16)
  assert(Buffer.isBuffer(data) && data.length >= 2 && data.length <= 40)

  const versionOp = version === 0 ? 'OP_0' : `OP_${version + 0x50}`
  const formatData = format(data)

  const script = Buffer.alloc(2 + format.bytes)

  script[0] = opcodes[versionOp]
  script.set(format(data))

  return script
}

// encoding format raw data to be put onto stack as bytes
function format (entry) {
  if (entry.length === 0) return Buffer.from([opcodes.OP_0])

  entry = Buffer.from(entry, 'hex')
  var prefix = prefixLength(entry)

  format.bytes = prefixLength.bytes + entry.byteLength
  return Buffer.concat([prefix, entry])
}

// prefix data to be put onto stack with length field
function prefixLength (entry) {
  var length = int.encode(entry.byteLength)
  var prefix = new Uint8Array(1)

  switch (true) {
    case (int.encode.bytes === 1 && length > 0xfb) : {
      prefix[0] = opcodes.OP_PUSHDATA1
      break
    }

    case (int.encode.bytes === 1) : {
      prefixLength.bytes = 1
      return length
    }

    case (int.encode.bytes === 2) : {
      prefix[0] = opcodes.OP_PUSHDATA2
      break
    }

    case (int.encode.bytes === 4) : {
      prefix[0] = opcodes.OP_PUSHDATA4
      break
    }
  }

  prefixLength.bytes = 1 + int.encode.bytes
  prefix = Buffer.concat([prefix, length])
  return prefix
}

function addressFromScript (script, testnet = false) {
  assert(Buffer.isBuffer(script), 'script hash must be passed as raw bytes')

  const shaResult = Buffer.alloc(32)

  // compute RIPEMD160 of SHA result
  const digest = hash160(script)
  
  let extendedDigest = Buffer.alloc(21)
  extendedDigest[0] = testnet ? 0xc4 : 0x05
  extendedDigest.set(digest, 1)

  // first 4 bytes of SHAd result taken as checksum
  const checksum = sha256(sha256(extendedDigest)).slice(0, 4)

  // base58 encode result
  const address = Buffer.concat([extendedDigest, checksum])
  return base58.encode(address)
}

function sha256 (data) {
  const buf = Buffer.alloc(32)
  sodium.crypto_hash_sha256(buf, data)
  return buf
}

function hash160 (data) {
  return crypto.createHash('ripemd160').update(data).digest()
}
