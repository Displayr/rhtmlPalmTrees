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

    description = dimnames(data)
    row.names = description[[1]]
    col.names = description[[2]]
    rc.names = names(description)
    # create a list that contains the settings
    settings <- list(
        rowNames = row.names,
        colNames = col.names,
        rowHeading = rc.names[1],
        colHeading = rc.names[2]
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
