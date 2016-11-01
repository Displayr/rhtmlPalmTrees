#' Create a PalmTree plot
#'
#' @param data numeric matrix or data frame
#' @param weights numeric vector specifying weights. Length must equal to \code{ncol(data)}
#' @param row.names character vector specifying x ticks. Default value are obtained from \code{rownames(data)}.
#' @param row.heading character, used as x label
#' @param col.names character vector specifying the legend. Default value obtained from \code{colnames(data)}.
#' @param col.heading character vector specifying the heading
#' @param tooltips logical, whether to attach tooltips on mouseover, default true.
#' @param prefix prefix of numbers in the tooltips. If column.as.heights is NULL (default), the y axis will also have the same prefix. If suffix is not provided, prefix will take suffix' place on the y axis.
#' @param suffix suffix of numbers in the tooltips. If column.as.heights is NULL (default), the y axis will also have the same suffix.
#' @param column.as.heights Integer to specify which column can be used as tree heights.
#' @param y.show Logical. Show y axis?
#' @param y.lab y axis label
#' @param y.prefix prefix of y axis ticks. This argument is ignored when column.as.heights is NULL (default), in which case prefix is used.
#' @param y.suffix suffix of y axis ticks. This argument is ignored when column.as.heights is NULL (default), in which case suffix is used.
#' @param y.digits integer to control the number of decimal places of the y axis
#' @param colors colors of the leaves. D3 colors will be used if no values are provided.
#' @param digits integer to control the number of decimal places in the tooltips
#' @param order = c("original", "alphabetical", "ascending", "descending") specifies the column order with default = "descending".
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
#' @export
PalmTrees <- function(
    data = NULL,
    weights = NULL,
    row.names = NULL,
    row.font.size = 10,
    row.font.family = "sans-serif",
    row.heading = NULL,
    row.heading.font.size = 10,
    row.heading.font.family = "sans-serif",
    col.names = NULL,
    col.font.size = 10,
    col.font.family = "sans-serif",
    col.heading = NULL,
    col.heading.font.size = 12,
    col.heading.font.family = "sans-serif",
    tooltips = TRUE,
    tooltips.font.size = 10,
    tooltips.font.family = "sans-serif",
    tooltips.heading.font.size = 12,
    tooltips.heading.font.family = "sans-serif",
    prefix = NULL,
    suffix = NULL,
    column.as.heights = NULL,
    digits = 1,
    y.show = TRUE,
    y.lab = NULL,
    y.prefix = NULL,
    y.suffix = NULL,
    y.digits = 1,
    y.font.size = 10,
    y.font.family = "sans-serif",
    y.lab.font.size = 12,
    y.lab.font.family = "sans-serif",
    colors = NULL,
    order = "descending",
    width = NULL,
    height = NULL) {

    if (digits < 0)
        digits = 0


    if (class(data) == "data.frame") {

        for (i in 1:ncol(data))
            data[,i] <- as.numeric(data[, i])
        data = as.matrix(data)

    } else if (class(data) == "matrix") {

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

    if (!is.null(column.as.heights)) {
        if (!is.vector(data)) {
            bar.heights = data[,column.as.heights]
            names(bar.heights) = NULL
            if (nc == length(col.names)) {
                if (is.null(y.lab))
                    y.lab = col.names[column.as.heights]
                col.names = col.names[-column.as.heights]
            }
            data = data[,-column.as.heights]
        } else {
            stop("Input data must have > 1 columns to use as fixed trees")
        }
    } else {
        bar.heights = NULL
    }

    # create a list that contains the settings
    settings <- list(
        rawData = raw.data,
        weights = weights,
        rowNames = row.names,
        colNames = col.names,
        rowHeading = row.heading,
        colHeading = col.heading,
        showYAxis = y.show,
        ylab = y.lab,
        yprefix = y.prefix,
        ysuffix = y.suffix,
        ydigits = y.digits,
        tooltips = tooltips,
        digits = digits,
        colors = colors,
        barHeights = bar.heights,
        order = order,
        prefix = prefix,
        suffix = suffix
    )

    # pass the data and settings using 'x'
    x <- list(
        data = data,
        settings = settings
    )

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
