import _ from 'lodash'

const defaultConfig = {
  colFontColor: '#000000',
  colFontColorUnselected: '#aaaaaa',
  colFontFamily: 'sans-serif',
  colFontSize: 11,
  colHeading: '',
  colHeadingFontColor: '#000000',
  colHeadingFontFamily: 'sans-serif',
  colHeadingFontSize: 12,
  digits: 0,
  footerFontColor: '#000000',
  footerFontFamily: 'sans-serif',
  footerFontSize: 11,
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
  subtitleFontColor: '#000000',
  subtitleFontFamily: 'sans-serif',
  subtitleFontSize: 18,
  suffix: '',
  titleFontColor: '#000000',
  titleFontFamily: 'sans-serif',
  titleFontSize: 24,
  tooltips: false,
  yFontColor: '#000000',
  yFontFamily: 'sans-serif',
  yFontSize: 11,
  ydigits: 1,
  ylab: '',
  yLabFontColor: '#000000',
  yLabFontFamily: 'sans-serif',
  yLabFontSize: 12,
}

function buildConfig (userConfig) {
  const config = _.merge({}, defaultConfig, userConfig)
  if (_.isNull(config.prefix)) { config.prefix = '' }
  if (_.isNull(config.suffix)) { config.suffix = '' }
  return config
}

module.exports = buildConfig
