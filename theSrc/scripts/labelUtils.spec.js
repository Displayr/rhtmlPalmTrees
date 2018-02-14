import _ from 'lodash'
import {splitIntoLines, tokenizer} from './labelUtils'

/* global expect */

describe('tokenizer():', function () {
  const tests = [
    {input: 'foo  bar  ', expected: ['foo', 'bar']}
  ]

  _(tests).each(({input, expected}) => {
    it(`${input} -> ${JSON.stringify(expected)}`, function () {
      expect(tokenizer(input)).to.deep.equal(expected)
    })
  })
})

describe('splitIntoLines():', function () {
  const tests = [
    { input: 'foo', maxWidth: 50, expected: ['foo'] },
    { input: 'foo', maxWidth: 1, expected: ['foo'] },
    { input: 'foo bar', maxWidth: 1, expected: ['foo', 'bar'] },
    { input: 'foo bar quuz', maxWidth: 1, expected: ['foo', 'bar', 'quuz'] },
    { input: 'foo bar quuz', maxWidth: 50, expected: ['foo bar', 'quuz'] },
    { input: 'foo bar quuz', maxWidth: 100, expected: ['foo bar quuz'] },
    { input: '123 456 7890', maxWidth: 1, expected: ['123', '456', '7890'] },
    { input: '123 456 7890', maxWidth: 50, expected: ['123 456', '7890'] },
    { input: '123 456 7890', maxWidth: 75, expected: ['123 456 7890'] },
    { input: '123 456 7890', maxWidth: 100, expected: ['123 456 7890'] },
    { input: '123 -456 7890', maxWidth: 50, expected: ['123 -456', '7890'] },
    { input: '123 -456 7890', maxWidth: 100, expected: ['123 -456 7890'] },
    { input: '123 -456 7890', maxWidth: 200, expected: ['123 -456 7890'] },
    { input: '2018-01-21', maxWidth: 10, expected: ['2018-01-21'] },
    { input: '2018-01-21', maxWidth: 50, expected: ['2018-01-21'] },
    { input: '2018-01-21', maxWidth: 200, expected: ['2018-01-21'] },
    { input: 'foo -30', maxWidth: 1, expected: ['foo', '-30'] },
    { input: 'foo -30', maxWidth: 5, expected: ['foo', '-30'] },
    { input: 'foo -30', maxWidth: 20, expected: ['foo', '-30'] },
    { input: 'foo -30', maxWidth: 100, expected: ['foo -30'] },
    { input: '-30 foo', maxWidth: 1, expected: ['-30', 'foo'] },
    { input: '-30 foo', maxWidth: 5, expected: ['-30', 'foo'] },
    { input: '-30 foo', maxWidth: 20, expected: ['-30', 'foo'] },
    { input: '-30 foo', maxWidth: 100, expected: ['-30 foo'] },

    // some tests on font size
    { fontSize: '1', input: 'foo bar quuz', maxWidth: 50, expected: ['foo bar quuz'] },
    { fontSize: '10', input: 'foo bar quuz', maxWidth: 50, expected: ['foo bar', 'quuz'] },
    { fontSize: '20', input: 'foo bar quuz', maxWidth: 50, expected: ['foo', 'bar', 'quuz'] }
  ]

  _(tests).each(({input, maxWidth, expected, fontSize = '12', fontFamily = 'sans-serif'}) => {
    const testName = `split("${input}", ${maxWidth}, ${fontSize}) = ${JSON.stringify(expected)}`
    it(testName, function () {
      expect(splitIntoLines(input, maxWidth, fontSize, fontFamily)).to.deep.equal(expected)
    })
  })
})
