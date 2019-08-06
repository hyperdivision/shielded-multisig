const shield = require('.')
const test = require('tape')

const masterKeys = [
  Buffer.from('03a6c20e343dac4741b77d0d4ae8246cbdd1f375a38faf675386fe9921a0aaeb75', 'hex'),
  Buffer.from('0378e367ee344232a095189d86e9c012b65f23b1beb9e9051ba206b1d99e70f7e2', 'hex'),
  Buffer.from('027de470ba7cd817de96450466f7079828b6a44f23a5d91f7495730e2972f7fb5a', 'hex'),
  Buffer.from('03c0c90453b762ac8e2f569a20e05d07f15d9462fa36dbced3193462db05cf9e28', 'hex'),
  Buffer.from('02575b15fc2e030f0c94deeacf4d97ec47de265bb0ab6766447a3d4e8d2142cfa4', 'hex')
]

const masterPrivate = [
  Buffer.from('b8263cdcb716f41ed35fb2178d22eaea77968f4628f140dc88ec084120df4222', 'hex'),
  Buffer.from('02cff4a69f258f0eb9c916e1db7f4739a62e6cdc4d6aa1d6e7b0b1b154bc6ff5', 'hex'),
  Buffer.from('4698b96b77eed0ec9ca4e2f83f2768a26414b62668dc0a0487b089b18ecc9315', 'hex'),
  Buffer.from('3c29fa53f01c943e94595ad13f4a849b24a291c35535f43eb87cf35710c3a0da', 'hex'),
  Buffer.from('57de61568586418d5862b85516c4f5b7df61d0829d3eb62923a705fcd8381655', 'hex')
]

test('tweak', function (assert) {
  const { tweak, address } = shield.address({ id: Buffer.alloc(32, 'hello world'), counter: 0 }, masterKeys, 3)
  const { tweak: tweakS, script } = shield.redeemScript(tweak, masterKeys, 3)

  assert.same(tweak, tweakS)
  assert.end()
})
