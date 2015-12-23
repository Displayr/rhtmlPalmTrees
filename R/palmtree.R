#' Create a palm tree
#'
#' @param data Input data
#' @param weights vector specifying weights

#' @import htmlwidgets
#' @export
palmtree <- function(
    data = NULL,
    weights = NULL,
    prefix = "",
    suffix = "",
    xlab = "",
    colors = NULL,
    width = NULL,
    height = NULL) {

    row.names <- dimnames(data)[[1]]
    col.names <- dimnames(data)[[2]]
    # create a list that contains the settings
    settings <- list(
        rowNames = row.names,
        colNames = col.names
    )

    # pass the data and settings using 'x'
    x <- list(
        data = data,
        settings = settings
    )

    # create the widget
    htmlwidgets::createWidget(
        name = "palmtree",
        x,
        width = width,
        height = height,
        sizingPolicy = htmlwidgets::sizingPolicy(
            padding = 5,
            browser.fill = TRUE, # resizing will not work if FALSE
            viewer.fill = TRUE
        ),
        package = "palmtree"
    )
}
