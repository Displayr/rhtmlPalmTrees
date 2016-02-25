#' Create a palm tree
#'
#' @param data numeric matrix or data frame
#' @param weights numeric vector specifying weights
#' @param row.names character vector specifying x ticks
#' @param row.heading character, used as x label
#' @param col.names character vector specifying the legend
#' @param col.heading character vector specifying the heading
#' @param tooltips logical, whether to attach tooltips on mouseover, default true.
#' @param prefix prefix of numbers in the tooltips. If column.as.heights is NULL, the y axis will have the same prefix. If suffix is not provided, prefix will take suffix' place on the y axis.
#' @param suffix suffix of numbers in the tooltips. If column.as.heights is NULL, the y axis will have the same suffix.
#' @param column.as.heights Integer to specify which column can be used as tree heights.
#' @param y.lab y axis label
#' @param y.prefix prefix of y axis ticks when column.as.heights is not NULL. This argument is ignored when column.as.heights is NULL.
#' @param y.suffix suffix of y axis ticks when column.as.heights is not NULL. This argument is ignored when column.as.heights is NULL.
#' @param colors colors of the leaves  (should be optional but now it must be provided)
#' @param width
#' @param height
#'
#' @import htmlwidgets
#' @export
PalmTreePlot <- function(
    data = NULL,
    weights = NULL,
    row.names = NULL,
    row.heading = NULL,
    col.names = NULL,
    col.heading = NULL,
    tooltips = TRUE,
    prefix = NULL,
    suffix = NULL,
    column.as.heights = NULL,
    y.lab = NULL,
    y.prefix = NULL,
    y.suffix = NULL,
    colors = NULL,
    width = NULL,
    height = NULL) {

    if (sum(data < 0) > 0) {
        stop("Input data must not contain negative numbers.")
    }

    nr = nrow(data);
    nc = ncol(data);

    if (is.null(weights))
        weights = rep(1,nc)

    if (is.null(col.names))
        col.names = paste0("column", 1:nc)
    else if (length(col.names) > nc)
        col.names = col.names[1:nc]
    else if (length(col.names) < nc)
        col.names = c(col.names, paste0("column", (length(col.names)+1):nc))

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
        weights = weights,
        rowNames = row.names,
        colNames = col.names,
        rowHeading = row.heading,
        colHeading = col.heading,
        ylab = y.lab,
        tooltips = tooltips,
        colors = colors,
        barHeights = bar.heights,
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
        name = "PalmTreePlot",
        x,
        width = width,
        height = height,
        sizingPolicy = htmlwidgets::sizingPolicy(
            padding = 5,
            browser.fill = TRUE, # resizing will not work if FALSE
            viewer.fill = TRUE
        ),
        package = "PalmTreePlot"
    )
}
