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
    hFamily,
    hSize,
    fFamily,
    fSize,
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
      fFamily,
      fSize,
      barWidth: (columnValue) ? tipScale(columnValue) : 0,
      barColor: colors[index],
      unselectedColor
    })
  }).join('\n')

  let headingText = `${rowName}${(_.isEmpty(yLabel) ? '' : ` - ${yLabel}`)} ${rowTotal}`
  return `<div class="tipHeading tip-${rowIndex}" style="font-family:${hFamily};font-size:${hSize}px">${headingText}</div>
    <div class="tipTableContainer">
      <table class="tipTable">
        <tbody>
        ${rowContent}
        </tbody>
      </table>
    </div>`
}

// TODO set class if valueEnabled == false
function makeTipContentRow ({
  columnIndex,
  value = 'No Data',
  valueEnabled,
  barWidth,
  barColor,
  name,
  prefix,
  suffix,
  fFamily,
  fSize,
  unselectedColor
}) {
  return `<tr class="tip-column tip-column-${columnIndex} ${(valueEnabled) ? '' : 'column-off"'}">
    <td style="text-align:right;font-family:${fFamily};font-size:${fSize}px">${prefix || ''}${value || ''}${suffix || ''}</td>
    <td style="text-align:left;font-family:${fFamily};font-size:${fSize}px">${name}</td>
    <td style="text-align:center">
      <div style="width:${barWidth}px;height:8px;background-color:${(valueEnabled) ? barColor : unselectedColor}"></div>
    </td>
  </tr>`
}

module.exports = makeTipContent
