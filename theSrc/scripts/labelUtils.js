import $ from 'jquery'
import _ from 'lodash'

let idSeed = 0
function getUniqueId () {
  return `wraptext-${++idSeed}`
}

function getTextLength (inputString, fontSize = 12, fontFamily = 'sans-serif') {
  const uniqueId = getUniqueId()
  const divWrapper = $(`<div id="${uniqueId}" style="display:inline-block; font-size: ${fontSize}px; font-family: ${fontFamily}">${inputString}</div>`)
  $(document.body).append(divWrapper)
  const { width } = document.getElementById(uniqueId).getBoundingClientRect()
  divWrapper.remove()
  return width
}

function tokenizer (inputString) {
  return inputString.split(' ').map(_.trim).filter((token) => !_.isEmpty(token))
}

function splitIntoLines (inputString, width, fontSize = 12, fontFamily = 'sans-serif') {
  let tokens = tokenizer(inputString)

  let currentLine = []
  let lines = []
  let token = null
  while (token = tokens.shift()) { // eslint-disable-line no-cond-assign
    currentLine.push(token)

    if (getTextLength(currentLine.join(' '), fontSize, fontFamily) > width && currentLine.length > 1) {
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

module.exports = {
  splitIntoLines,
  tokenizer
}
