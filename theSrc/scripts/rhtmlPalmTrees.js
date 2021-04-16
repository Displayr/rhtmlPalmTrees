/* global HTMLWidgets */

import 'babel-polyfill'
import widgetFactory from './rhtmlPalmTrees.factory'

HTMLWidgets.widget({
  name: 'rhtmlPalmTrees',
  type: 'output',
  factory: widgetFactory,
})
