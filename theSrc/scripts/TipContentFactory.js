// tip depends on
// this.settings.tooltipsHeadingFontFamily
// this.settings.tooltipsHeadingFontSize
// this.settings.ylab // ignore for now
// this.settings.barHeights // ignore for now (note that the prefix and suffix changes when barHeights is enabled !!)
// if column is disabled then use color #999 // ignore for now
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
    columnNames,
    data,
    hFamily,
    hSize,
    fFamily,
    fSize,
    digits = 1,
    prefix = '',
    suffix = '',
    columnState,
    tipScale,
    colors
  }) {
  const rowContent = data.map((columnValue, index) => {
    return makeTipContentRow({
      value: columnValue.toFixed(digits),
      valueEnabled: columnState[index],
      columnIndex: index,
      name: columnNames[index],
      prefix,
      suffix,
      fFamily,
      fSize,
      barWidth: (columnValue) ? tipScale(columnValue) : 0,
      barColor: colors[index]
    })
  }).join('\n')

  return `<div class="tipHeading tip-${rowIndex}" style="font-family:${hFamily};font-size:${hSize}px">${rowName}</div>
    <div class="tipTableContainer">
      <table class="tipTable">
        <tbody>
        ${rowContent}
        </tbody>
      </table>
    </div>`
}

// TODO set class if valueEnabled == false
function makeTipContentRow ({ columnIndex, value = 'No Data', valueEnabled, barWidth, barColor, name, prefix, suffix, fFamily, fSize }) {
  return `<tr class="tip-column tip-column-${columnIndex} ${(valueEnabled) ? '' : 'class="column-off"'}">
    <td style="text-align:right;font-family:${fFamily};font-size:${fSize}px">${prefix || ''}${value || ''}${suffix || ''}</td>
    <td style="text-align:left;font-family:${fFamily};font-size:${fSize}px">${name}</td>
    <td style="text-align:center">
      <div style="width:${barWidth}px;height:8px;background-color:${barColor}"></div>
    </td>
  </tr>`
}

module.exports = makeTipContent
