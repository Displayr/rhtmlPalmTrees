import _ from 'lodash'

const defaultConfig = {
  digits: 0,
  hoverColor: '#eeeeee',
  frondColorUnselected: '#cccccc',
  frondColorThis: '#000000',
  frondColorThat: '#cccccc',
  colFontSize: 11,
  colFontFamily: 'sans-serif',
  colFontColor: '#000000',
  colFontColorUnselected: '#aaaaaa',
  colHeading: '',
  colHeadingFontSize: 0,
  colHeadingFontFamily: 'sans-serif',
  colHeadingFontColor: '#000000',
  order: 'descending',
  rowFontSize: 11,
  rowFontFamily: 'sans-serif',
  rowFontColor: '#000000',
  rowHeading: '',
  rowHeadingFontSize: 12,
  rowHeadingFontFamily: 'sans-serif',
  rowHeadingFontColor: '#000000',
  sidebarBackgroundColor: '#ffffff',
  sidebarMaxProportion: 0.25,
  sidebarBorderColor: '#000000',
  tooltips: false,
  yFontColor: '#000000',
  ylab: '',
  yLabFontColor: '#000000'
}

function buildConfig (userConfig) {
  const config = _.merge({}, defaultConfig, userConfig)

  // NB the following adjustments correct issues in the callee (which we cannot control)

  return config
}

module.exports = buildConfig
