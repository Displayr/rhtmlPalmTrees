Important
---------
This package uses a customised htmlwidget package that allows local state saving. The official htmlwidget package will not work. Download the customised package by running install_github('Displayr/htmlwidgets')


Installation
------------
devtools::install_github("Displayr/rhtmlPalmTrees")


Usage
-----
data("CSDperceptions", package = "rhtmlPalmTrees")
weights = rep(1,ncol(CSDperceptions))
prefix = ""
suffix = "%"
rhtmlPalmTrees::PalmTrees(data = CSDperceptions,
                            weights = weights,
                            row.names = rownames(CSDperceptions),
                            row.heading = names(dimnames(CSDperceptions))[1],
                            col.names = colnames(CSDperceptions),
                            col.heading = names(dimnames(CSDperceptions))[2],
                            prefix = prefix,
                            suffix = suffix,
                            tooltips = TRUE,
                            colors = qColors)
