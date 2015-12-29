#' Create a palm tree
#'
#' @param data Input data
#' @param weights vector specifying weights

#' @import htmlwidgets
#' @export
PalmTreePlot <- function(
    data = NULL,
    weights = NULL,
    row.names = NULL,
    row.heading = NULL,
    col.names = NULL,
    col.heading = NULL,
    prefix = "",
    suffix = "",
    xlab = "",
    colors = NULL,
    width = NULL,
    height = NULL) {


    # create a list that contains the settings
    settings <- list(
        weights = weights,
        rowNames = row.names,
        colNames = col.names,
        rowHeading = row.heading,
        colHeading = col.heading
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
