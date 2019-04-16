import _ from 'lodash'

const defaultConfig = {
  colFontColor: '#000000',
  colFontColorUnselected: '#aaaaaa',
  colFontFamily: 'sans-serif',
  colFontSize: 11,
  colHeading: '',
  colHeadingFontColor: '#000000',
  colHeadingFontFamily: 'sans-serif',
  colHeadingFontSize: 0,
  digits: 0,
  frondColorThat: '#cccccc',
  frondColorThis: '#000000',
  frondColorUnselected: '#cccccc',
  hoverColor: '#eeeeee',
  order: 'descending',
  prefix: '',
  rowFontColor: '#000000',
  rowFontFamily: 'sans-serif',
  rowFontSize: 11,
  rowHeading: '',
  rowHeadingFontColor: '#000000',
  rowHeadingFontFamily: 'sans-serif',
  rowHeadingFontSize: 12,
  sidebarBackgroundColor: '#ffffff',
  sidebarBorderColor: '#000000',
  sidebarMaxProportion: 0.25,
  suffix: '',
  tooltips: false,
  yFontColor: '#000000',
  ylab: '',
  yLabFontColor: '#000000'
}

function buildConfig (userConfig) {
  const config = _.merge({}, defaultConfig, userConfig)
  if (_.isNull(config.prefix)) { config.prefix = '' }
  if (_.isNull(config.suffix)) { config.suffix = '' }
  return config
}

module.exports = buildConfig
