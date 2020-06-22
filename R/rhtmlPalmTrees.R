#' Create a PalmTree plot
#'
#' @param data numeric matrix or data frame
#' @param weights numeric vector specifying weights. Length must equal to \code{ncol(data)}
#' @param hover.color color of cells that are hilighted by mouse interaction
#' @param row.names character vector specifying x ticks. Default value are obtained from \code{rownames(data)}
#' @param row.font.size Default x axis font size = 11
#' @param row.font.family x axis font family = "sans-serif"
#' @param row.font.color font color for x axis text
#' @param row.heading character, used as x label
#' @param row.heading.font.size Default row heading font size = 12
#' @param row.heading.font.family Default row heading font family = "sans-serif"
#' @param row.heading.font.color font color for x axis title text
#' @param col.names character vector specifying the legend. Default value obtained from \code{colnames(data)}
#' @param col.font.size Default column font size = 11
#' @param col.font.family Default column font family = "sans-serif"
#' @param footer character. Sets the footer of the chart, defaults to NULL. The footer is left-aligned.
#' @param footer.font.size integer. Font size of the chart footer.font.size, defaults to 11 pixcels.
#' @param footer.font.family character. Font family of the chart footer.font.family, defaults to "sans-serif".
#' @param footer.font.color An RGB character to set the color of the chart footer.font.color. Defaults to "#000000".
#' @param frond.color.unselected color used on unselected fronds on the main plot
#' @param frond.color.this color used in legend to show frond placement in each frond legend row
#' @param frond.color.that color used in legend for other fronds in frond legend row
#' @param col.font.color legend font color
#' @param col.font.color.unselected legend fond color to indicate inactive selections (rows and orders)
#' @param col.heading character vector specifying the heading
#' @param col.heading.font.size Default column heading font size = 12
#' @param col.heading.font.family Default column heading font family = "sans-serif"
#' @param col.heading.font.color legend title font color
#' @param legend.maxProportion Max proportion of legend width to plot width. Default = 0.25
#' @param legend.background.color the canvas background color
#' @param legend.border.color legend border color
#' @param subtitle character. Sets the subtitle of the chart, defaults to NULL. The subtitle is centred.
#' @param subtitle.font.size integer. Font size of the chart subtitle, defaults to 18 pixcels.
#' @param subtitle.font.family character. Font family of the chart subtitle, defaults to "sans-serif".
#' @param subtitle.font.color An RGB character to set the color of the chart subtitle. Defaults to "#000000".
#' @param title character. Sets the title of the chart, defaults to NULL. The title is centred.
#' @param title.font.size integer. Font size of the chart title, defaults to 24 pixcels.
#' @param title.font.family character. Font family of the chart title, defaults to "sans-serif".
#' @param title.font.color An RGB character to set the color of the chart title. Defaults to "#000000".
#' @param tooltips logical, whether to attach tooltips on mouseover, default true
#' @param tooltips.font.size Default tooltip font size = 11
#' @param tooltips.font.family Default tooltip font family = "sans-serif"
#' @param tooltips.heading.font.size Default tooltip heading font size = 12
#' @param tooltips.heading.font.family Default tooltip heading font family = "sans-serif"
#' @param y.show show the y axis
#' @param y.lab y axis labels
#' @param y.digits integer to control the number of decimal places of the y axis
#' @param y.font.size Default y axis font size = 11
#' @param y.font.family Default y axis font family = "sans-serif"
#' @param y.font.color y axis font color
#' @param y.lab.font.size Default y axis label font size = 12
#' @param y.lab.font.family Default y axis label font family = "sans-serif"
#' @param y.lab.font.color y axis labels font color
#' @param prefix prefix of numbers in the tooltips. If suffix is not provided, prefix will take suffix' place on the y axis
#' @param suffix suffix of numbers in the tooltips
#' @param colors colors of the fronds. D3 colors will be used if no values are provided
#' @param digits integer to control the number of decimal places in the tooltips
#' @param order = c("original", "alphabetical", "ascending", "descending") specifies the column order with default = "descending"
#' @param width
#' @param height
#'
#' @details
#'
#' Frond size is calculated by mapping \code{data} to a linear scale \code{[min_width, max_width]} so that
#' \code{min(data)} takes \code{min_width} and \code{max(data)} takes \code{max_width}.
#' \code{min_width} is currently set at 8 pixcels and \code{max_width} is calculated using the available space between x ticks.
#'
#' @examples
#'
#' data("CSDperceptions", package = "rhtmlPalmTrees")
#'
#' weights = rep(1,ncol(CSDperceptions))
#' prefix = ""
#' suffix = "%"
#' rhtmlPalmTrees::PalmTrees(data = CSDperceptions,
#'                          weights = weights,
#'                          row.names = rownames(CSDperceptions),
#'                          row.heading = names(dimnames(CSDperceptions))[1],
#'                          col.names = colnames(CSDperceptions),
#'                          col.heading = names(dimnames(CSDperceptions))[2],
#'                          prefix = prefix,
#'                          suffix = suffix,
#'                          tooltips = TRUE,
#'                          colors = qColors)
#'
#'
#'
#' @import htmlwidgets
#' @importFrom jsonlite unbox
#' @export


PalmTrees <- function(
  col.font.color = "#000000",
  col.font.color.unselected = "#aaaaaa",
  col.font.family = "sans-serif",
  col.font.size = 11,
  col.heading = NULL,
  col.heading.font.color = "#000000",
  col.heading.font.family = "sans-serif",
  col.heading.font.size = 12,
  col.names = NULL,
  colors = NULL,
  data = NULL,
  digits = 1,
  footer = NULL,
  footer.font.size = 11,
  footer.font.family = "sans-serif",
  footer.font.color = "#000000",
  frond.color.that = "#cccccc",
  frond.color.this = "#000000",
  frond.color.unselected = "#cccccc",
  height = NULL,
  hover.color = "#eeeeee",
  legend.background.color = "#ffffff",
  legend.border.color = "#000000",
  legend.maxProportion = 0.25,
  order = "descending",
  prefix = NULL,
  row.font.color = "#000000",
  row.font.family = "sans-serif",
  row.font.size = 11,
  row.heading = NULL,
  row.heading.font.color = "#000000",
  row.heading.font.family = "sans-serif",
  row.heading.font.size = 12,
  row.names = NULL,
  subtitle = NULL,
  subtitle.font.size = 18,
  subtitle.font.family = "sans-serif",
  subtitle.font.color = "#000000",
  suffix = NULL,
  title = NULL,
  title.font.size = 24,
  title.font.family = "sans-serif",
  title.font.color = "#000000",
  tooltips = TRUE,
  tooltips.font.family = "sans-serif",
  tooltips.font.size = 11,
  tooltips.heading.font.family = "sans-serif",
  tooltips.heading.font.size = 12,
  weights = NULL,
  width = NULL,
  y.digits = 1,
  y.font.color = "#000000",
  y.font.family = "sans-serif",
  y.font.size = 11,
  y.lab = NULL,
  y.lab.font.color = "#000000",
  y.lab.font.family = "sans-serif",
  y.lab.font.size = 12,
  y.show = TRUE
) {

    if (digits < 0)
        digits <- 0

    if (any(dim(data) == 0))
        stop("Input data is empty.")

    if (inherits(data, "data.frame")) {

        for (i in 1:ncol(data))
            data[,i] <- as.numeric(data[, i])
        data = as.matrix(data)

    } else if (inherits(data, "matrix")) {

        for (i in 1:ncol(data))
            data[,i] <- as.numeric(data[, i])

    } else {
        stop("Input data must be a matrix or a data frame.")
    }

    raw.data = data
    if (sum(is.na(data)) > 0) {
        data[is.na(data)] = 0
        warning("Missing values detected.")
    }

    if (sum(data < 0) > 0) {
        stop("Input data must not contain negative numbers.")
    }

    nr = nrow(data);
    nc = ncol(data);

    if (is.null(weights))
        weights = rep(1/nc,nc)
    else {
        if (length(weights) != nc) {
            stop("The length of weights must be the same as the number of columns.")
        }
        weights = weights/sum(weights)
    }


    if (is.null(col.names))
        col.names = colnames(data)

    if (is.null(col.names))
        col.names = paste0("column", 1:nc)
    else if (length(col.names) > nc)
        col.names = col.names[1:nc]
    else if (length(col.names) < nc)
        col.names = c(col.names, paste0("column", (length(col.names)+1):nc))

    if (is.null(row.names))
        row.names = rownames(data)

    if (is.null(row.names))
        row.names = paste0("row", 1:nr)
    else if (length(row.names) > nr)
        row.names = row.names[1:nr]
    else if (length(row.names) < nr)
        row.names = c(row.names, paste0("row", (length(row.names)+1):nr))

    if (is.null(col.heading))
        col.heading = "Columns"

    if (is.null(row.heading))
        row.heading = "Rows"



    # recycle colors
    if (!is.null(colors) && length(colors) < length(col.names)) {
        a = rbind(colors, col.names)
        colors = a[1,]
    }

    # create a list that contains the settings
    settings <- list(
      title = unbox(title),
      titleFontSize = unbox(title.font.size),
      titleFontFamily = unbox(title.font.family),
      titleFontColor = unbox(title.font.color),
      subtitle = unbox(subtitle),
      subtitleFontSize = unbox(subtitle.font.size),
      subtitleFontFamily = unbox(subtitle.font.family),
      subtitleFontColor = unbox(subtitle.font.color),
      footer = unbox(footer),
      footerFontSize = unbox(footer.font.size),
      footerFontFamily = unbox(footer.font.family),
      footerFontColor = unbox(footer.font.color),
      rawData = raw.data,
      weights = weights,
      hoverColor = hover.color,
      rowNames = row.names,
      rowFontSize = unbox(row.font.size),
      rowFontFamily = unbox(row.font.family),
      rowFontColor = row.font.color,
      rowHeading = unbox(row.heading),
      rowHeadingFontSize = unbox(row.heading.font.size),
      rowHeadingFontFamily = unbox(row.heading.font.family),
      rowHeadingFontColor = row.heading.font.color,
      frondColorUnselected = frond.color.unselected,
      frondColorThis = frond.color.this,
      frondColorThat = frond.color.that,
      colNames = col.names,
      colFontSize = unbox(col.font.size),
      colFontFamily = unbox(col.font.family),
      colFontColor = col.font.color,
      colFontColorUnselected = col.font.color.unselected,
      colHeading = unbox(col.heading),
      colHeadingFontSize = unbox(col.heading.font.size),
      colHeadingFontFamily = unbox(col.heading.font.family),
      colHeadingFontColor = col.heading.font.color,
      sidebarBackgroundColor = legend.background.color,
      sidebarMaxProportion = unbox(legend.maxProportion),
      sidebarBorderColor = legend.border.color,
      tooltips = unbox(tooltips),
      tooltipsFontSize = unbox(tooltips.font.size),
      tooltipsFontFamily = unbox(tooltips.font.family),
      tooltipsHeadingFontSize = unbox(tooltips.heading.font.size),
      tooltipsHeadingFontFamily = unbox(tooltips.heading.font.family),
      showYAxis = unbox(y.show),
      ylab = unbox(y.lab),
      ydigits = unbox(y.digits),
      yFontSize =  unbox(y.font.size),
      yFontFamily =  unbox(y.font.family),
      yFontColor = y.font.color,
      yLabFontSize = unbox(y.lab.font.size),
      yLabFontFamily = unbox(y.lab.font.family),
      yLabFontColor = y.lab.font.color,
      digits = unbox(digits),
      colors = colors,
      order = unbox(order),
      prefix = unbox(prefix),
      suffix = unbox(suffix)
    )

    # pass the data and settings using 'x'
    x <- list(
        data = data,
        settings = settings
    )
    attr(x, "TOJSON_ARGS") = list(auto_unbox = FALSE)

    # create the widget
    htmlwidgets::createWidget(
        name = "rhtmlPalmTrees",
        x,
        width = width,
        height = height,
        sizingPolicy = htmlwidgets::sizingPolicy(
            padding = 5,
            browser.fill = TRUE, # resizing will not work if FALSE
            viewer.fill = TRUE
        ),
        package = "rhtmlPalmTrees"
    )
}
