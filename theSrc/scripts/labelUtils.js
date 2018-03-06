import $ from 'jquery'
import _ from 'lodash'

let idSeed = 0
function getUniqueId () {
  return `wraptext-${++idSeed}`
}

function getTextLengthUsingDivApproximation (inputString, fontSize = 12, fontFamily = 'sans-serif') {
  const uniqueId = getUniqueId()
  const divWrapper = $(`<div id="${uniqueId}" style="display:inline-block; font-size: ${fontSize}px; font-family: ${fontFamily}">${inputString}</div>`)
  $(document.body).append(divWrapper)
  const { width } = document.getElementById(uniqueId).getBoundingClientRect()
  divWrapper.remove()
  return width
}

function wordTokenizer (inputString) {
  return inputString.split(' ').map(_.trim).filter((token) => !_.isEmpty(token))
}

function splitIntoLines (inputString, width, fontSize = 12, fontFamily = 'sans-serif') {
  let tokens = wordTokenizer(inputString)

  let currentLine = []
  let lines = []
  let token = null
  while (token = tokens.shift()) { // eslint-disable-line no-cond-assign
    currentLine.push(token)

    if (getTextLengthUsingDivApproximation(currentLine.join(' '), fontSize, fontFamily) > width && currentLine.length > 1) {
      tokens.unshift(currentLine.pop())
      lines.push(`${currentLine.join(' ')}`)
      currentLine = []
    }
  }

  if (currentLine.length > 0) {
    lines.push(`${currentLine.join(' ')}`)
  }

  return lines
}

// TODO add test
function truncateTextGivenTextAndWidth ({text, fontSize, fontFamily, maxWidth}) {
  let initialCalculatedTextWidth = getTextLengthUsingDivApproximation(text, fontSize, fontFamily)
  if (initialCalculatedTextWidth <= maxWidth) { return text }
  let newText = text
  let fudge = 0
  while (getTextLengthUsingDivApproximation(`${newText}...`, fontSize, fontFamily) + fudge > maxWidth && newText.length > 0) {
    newText = newText.substring(0, newText.length - 1)
  }
  return `${newText}...`
}

function truncateD3TextSelection ({ d3Selection, maxTextWidth = 100, minTextCharacters = 0 }) {
  const svgElement = d3Selection.node()
  let text = d3Selection.text()
  d3Selection.text(`${text}...`)
  while (svgElement.getComputedTextLength() > maxTextWidth && text.length > minTextCharacters) {
    text = text.substring(0, text.length - 1)
    d3Selection.text(`${text}...`)
  }
}

module.exports = {
  truncateTextGivenTextAndWidth,
  truncateD3TextSelection,
  getTextLengthUsingDivApproximation,
  splitIntoLines,
  wordTokenizer
}
