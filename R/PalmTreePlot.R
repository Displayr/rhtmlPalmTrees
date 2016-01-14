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
    prefix = NULL,
    suffix = NULL,
    tooltips = NULL,
    colors = NULL,
    width = NULL,
    height = NULL) {

    if (sum(data < 0) > 0) {
        stop("Input data must not contain negative numbers.")
    }

    nr = nrow(data);
    nc = ncol(data);

    createHtmlTable <- function(heading, items, alignment) {
        # create a html table to align text
        this.table = "<table style='margin:0;border-spacing:2px 0;vertical-align:middle;padding:0'>"
        n.row = nrow(items)
        n.col = ncol(items)
        this.table = paste0(this.table, "<th colspan='", n.col,"', style='text-align:left'>", heading, "</th>")

        for (i in 1:n.row) {
            this.table = paste0(this.table, "<tr>")
            for (j in 1:n.col) {
                if (alignment[j] == "l") {
                    this.table = paste0(this.table, "<td style='text-align:", "left'", ">")
                } else if (alignment[j] == "r") {
                    this.table = paste0(this.table, "<td style='text-align:", "right'", ">")
                } else if (alignment[j] == "c") {
                    this.table = paste0(this.table, "<td style='text-align:", "center'", ">")
                } else {
                    stop("Incorrect alignment value. Permitted values are c('l','r','c')")
                }
                this.table = paste0(this.table, items[i,j])
                this.table = paste0(this.table, "</td>")
            }
            this.table = paste0(this.table, "</tr>")
        }
        this.table = paste0(this.table, "</table>")
    }


    if (!is.null(tooltips)) {
        if (tooltips == "Default") {

            if (is.null(weights))
                weights = rep(1, nc)

            tip.data = data
            for (i in 1:nr) {
                for (j in 1:nc) {
                    tip.data[i,j] = weights[j]*tip.data[i,j]
                }
                tip.data[i,] = tip.data[i,]/sum(tip.data[i,])
            }

            tip.data = formatC(tip.data*100, digits = 1, format = "f")
            column.labels.repeated = matrix(col.names, nr, nc, byrow = TRUE)

            if (!is.null(prefix)) {
                prefix.repeated = matrix(prefix, nr, nc, byrow = TRUE)
                tip.data = matrix(paste0(prefix.repeated, tip.data), nr)
            }

            if (!is.null(suffix)) {
                text.align = c("l","r","l")
                suffix.repeated = matrix(suffix, nr, nc, byrow = TRUE)
            } else {
                text.align = c("l","r")
            }

            tooltip.rows = rep("", nr)

            for (i in 1:nr) {
                if (!is.null(suffix)) {
                    table.body = t(rbind(column.labels.repeated[i,], tip.data[i,], suffix.repeated[i,]))
                } else {
                    table.body = t(rbind(column.labels.repeated[i,], tip.data[i,]))
                }

                tooltip.cell = createHtmlTable(row.names[i],table.body, text.align)
                tooltip.rows[i] = tooltip.cell
            }
            tooltips = tooltip.rows
        }
    }

    # create a list that contains the settings
    settings <- list(
        weights = weights,
        rowNames = row.names,
        colNames = col.names,
        rowHeading = row.heading,
        colHeading = col.heading,
        tooltips = tooltips,
        colors = colors
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
