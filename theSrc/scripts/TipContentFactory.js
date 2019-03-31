import _ from 'lodash'
// tip depends on
// this.settings.tooltipsHeadingFontFamily
// this.settings.tooltipsHeadingFontSize
// this.weightedSums
// this.settings.digits
// this.settings.suffix
// this.settings.prefix
// this.settings.tooltipsFontFamily
// this.settings.tooltipsFontSize
// this.tipBarScale

function makeTipContent ({
    rowIndex,
    rowName,
    rowTotal,
    yLabel,
    columnNames,
    data,
    headingFontFamily,
    headingFontSize,
    fontFamily,
    fontSize,
    digits = 1,
    prefix = '',
    suffix = '',
    columnStates,
    tipScale,
    colors,
    unselectedColor
  }) {
  const rowContent = data.map((columnValue, index) => {
    return makeTipContentRow({
      value: columnValue.toFixed(digits),
      valueEnabled: columnStates[index],
      columnIndex: index,
      name: columnNames[index],
      prefix,
      suffix,
      fontFamily,
      fontSize,
      barWidth: (columnValue) ? tipScale(columnValue) : 0,
      barColor: colors[index],
      unselectedColor
    })
  }).join('\n')

  let headingText = `${rowName}${(_.isEmpty(yLabel) ? '' : ` - ${yLabel}`)} ${rowTotal}`
  return `<div class="tipHeading tip-${rowIndex}" style="font-family:${headingFontFamily};font-size:${headingFontSize}px">${headingText}</div>
    <div class="tipTableContainer">
      <table class="tipTable">
        <tbody>
        ${rowContent}
        </tbody>
      </table>
    </div>`
}

function makeTipContentRow ({
  columnIndex,
  value = 'No Data',
  valueEnabled,
  barWidth,
  barColor,
  name,
  prefix,
  suffix,
  fontFamily,
  fontSize,
  unselectedColor
}) {
  return `<tr class="tip-column tip-column-${columnIndex} ${(valueEnabled) ? '' : 'column-off"'}">
    <td style="text-align:right;font-family:${fontFamily};font-size:${fontSize}px">${prefix || ''}${value || ''}${suffix || ''}</td>
    <td style="text-align:left;font-family:${fontFamily};font-size:${fontSize}px">${name}</td>
    <td style="text-align:center">
      <div style="width:${barWidth}px;height:8px;background-color:${(valueEnabled) ? barColor : unselectedColor}"></div>
    </td>
  </tr>`
}

module.exports = makeTipContent
