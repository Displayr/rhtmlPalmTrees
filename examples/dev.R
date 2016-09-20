
# library(devtools)
# install_github("xtmwang/rhtmlPalmTrees")
qColors <- c(grDevices::rgb(91, 155, 213, 255, max = 255), # blue
             grDevices::rgb(237, 125, 49, 255, max = 255), # orange
             grDevices::rgb(165, 165, 165, 255, max = 255), # grey
             grDevices::rgb(30, 192, 0, 255, max = 255), # yelow
             grDevices::rgb(68, 114, 196, 255, max = 255), # darker blue
             grDevices::rgb(112, 173, 71, 255, max = 255), # green
             grDevices::rgb(37, 94, 145, 255, max = 255), # even darker blue
             grDevices::rgb(158, 72, 14, 255, max = 255), # blood
             grDevices::rgb(99, 99, 99, 255, max = 255), # dark grey
             grDevices::rgb(153, 115, 0, 255, max = 255), # brown
             grDevices::rgb(38, 68, 120, 255, max = 255), # very dark blue
             grDevices::rgb(67, 104, 43, 255, max = 255), # darker green
             grDevices::rgb(255, 255, 255, 255, max = 255), # black
             grDevices::rgb(255, 35, 35, 255, max = 255)) # red
# qColors = substring(qColors,1,7)
# save(CSDperceptions, qColors, file = 'data/CSDperceptions.rda')
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

colorVec = substring(qColors,1,7)
colorVec = rep("#000",11)
CSDperceptions <- matrix(c(0.3004, 0.6864, 0.4975, 0.2908, 0.2781, 0.2642, 0.1916, 0.284, 0.3514, 0.2534, 0.2089,
                           c( 0.0198, 0.4604, 0.2151, 0.5235, 0.1151, 0.12, 0.5457, 0.3041, 0.06312, 0.384, 0.06064),
                           c( 0.01114, 0.4111, 0.1904, 0.4494, 0.06931, 0.1112, 0.4716, 0.2859, 0.0495, 0.3296, 0.03837),
                           c( 0.01114, 0.2373, 0.089, 0.2707, 0.05322, 0.06436, 0.2756, 0.1656, 0.02967, 0.1916, 0.02228),
                           c( 0.0198, 0.177, 0.07054, 0.0297, 0.0396, 0.02719, 0.0136, 0.02847, 0.0198, 0.02847, 0.02472),
                           c( 0.4543, 0.1275, 0.07673, 0.02847, 0.07293, 0.1077, 0.01609, 0.05198, 0.321, 0.01856, 0.0297),
                           c( 0.06807, 0.1089, 0.06064, 0.0198, 0.1174, 0.04084, 0.01609, 0.01733, 0.03465, 0.01361, 0.03589),
                           c( 0.08168, 0.224, 0.1015, 0.04579, 0.04815, 0.04084, 0.03094, 0.05562, 0.05322, 0.04084, 0.02847)),nrow=8,byrow=TRUE,
                         dimnames=list(Brand=c('Coke','V',"Red Bull","Lift Plus",'Diet Coke','Fanta','Lift','Pepsi'),
                                       Attribute=c('Kids', 'Teens', "Enjoy life", 'Picks you up', 'Refreshes', 'Cheers you up', 'Energy', 'Up-to-date', 'Fun', 'When tired', 'Relax')))

CSDperceptions1 <- matrix(c(0.3004, 0.6864, 0.4975, 0.2908, 0.2781, 0.2642, 0.1916, 0.284, 0.3514, 0.2534, 0.2089,
                           c( 0.0198, 0.4604, 0.2151, 0.5235, 0.1151, 0.12, 0.5457, 0.3041, 0.06312, 0.384, 0.06064),
                           c( 0.01114, 0.4111, 0.1904, 0.4494, 0.06931, 0.1112, 0.4716, 0.2859, 0.0495, 0.3296, 0.03837),
                           c( 0.01114, 0.2373, 0.089, 0.2707, 0.05322, 0.06436, 0.2756, 0.1656, 0.02967, 0.1916, 0.02228),
                           c( 0.0198, 0.177, 0.07054, 0.0297, 0.0396, 0.02719, 0.0136, 0.02847, 0.0198, 0.02847, 0.02472),
                           c( 0.4543, 0.1275, 0.07673, 0.02847, 0.07293, 0.1077, 0.01609, 0.05198, 0.321, 0.01856, 0.0297),
                           c( 0.06807, 0.1089, 0.06064, 0.0198, 0.1174, 0.04084, 0.01609, 0.01733, 0.03465, 0.01361, 0.03589),
                           c( 0.08168, 0.224, 0.1015, 0.04579, 0.04815, 0.04084, 0.03094, 0.05562, 0.05322, 0.04084, 0.02847)),nrow=8,byrow=TRUE,
                         dimnames=list(Brand=c('Coke','V',"Red Bull","Lift Plus",'This is a very-very-long brand name plus random hyphenated-words','Fanta','Lift','Pepsi'),
                                       Attribute=c('Kids', 'Teens', "Enjoy life", 'Picks you up', 'Refreshes', 'Cheers you up', 'Energy', 'Up-to-date', 'Fun', 'When tired', 'Relax')))


set.seed(123)
# weights = runif(ncol(CSDperceptions))
# weights = weights/sum(weights)

weights = rep(1,ncol(CSDperceptions))

### test cases
### testing column names
# test case 1: long column names, short heading
# col.names = description[[2]]
# test case 2: short column names, long heading
col.names = c("A","B","C","D","E","F","G","H","I","J","H")

### testing row and column names in a different language
# row.heading = "品牌"
# col.heading = "属性"
# row.names = c('可口可乐','V',"红牛","Lift Plus",'健怡可乐','芬达','Lift','百事')
# col.names = c("一","二","三","四","五","六","七","八","九","十","十一")

### testing units
# test case 1: both prefix and suffix
prefix = "$$$"
suffix = "per day day"
# test case 2: both prefix and suffix
prefix = ""
suffix = "%"
# # test case 4: no prefix, has suffix
# prefix = "$$$"
# suffix = "dog"
# test case 3: no prefix, has suffix
# prefix = ""
# suffix = "%"
# # test case 4: no prefix, has suffix
# prefix = "@#$"
# suffix = "dog"
#
# prefix = "ill"
# suffix = "dog"




PalmTrees(data = CSDperceptions)
PalmTrees(data = t(CSDperceptions))
PalmTrees(data = CSDperceptions1)
htmlwidgets::saveWidget(PalmTrees(data = CSDperceptions,
                                  row.heading = names(dimnames(CSDperceptions))[1],
                                  col.heading = names(dimnames(CSDperceptions))[2],
                                  y.lab = "Market value",
                                  prefix = prefix,
                                  suffix = suffix,
                                  tooltips = TRUE,
                                  colors = colorVec), file = "/Users/MichaelW/Work/palmtree/index.html", selfcontained = F)

PalmTrees(data = t(CSDperceptions),
                           row.heading = names(dimnames(CSDperceptions))[1],
                           col.heading = names(dimnames(CSDperceptions))[2],
                           y.lab = "Market value",
                           prefix = prefix,
                           suffix = suffix,
                           tooltips = TRUE,
                           colors = colorVec)

htmlwidgets::saveWidget(w, file = "/Users/MichaelW/Work/palmtree/index.html", selfcontained = F)
# use 1 column of data as heights, specifying y label
rhtmlPalmTrees::rhtmlPalmTrees(data = CSDperceptions,
                           weights = weights,
                           row.names = rownames(CSDperceptions),
                           row.heading = names(dimnames(CSDperceptions))[1],
                           col.names = colnames(CSDperceptions),
                           col.heading = names(dimnames(CSDperceptions))[2],
                           y.lab = "Market value",
                           prefix = prefix,
                           suffix = suffix,
                           y.prefix = "$",
                           y.suffix = "M",
                           tooltips = TRUE,
                           colors = colorVec,
                           column.as.heights = 1)

# use 1 column of data as heights, y label defaults to the column name
rhtmlPalmTrees::rhtmlPalmTrees(data = CSDperceptions,
                           weights = weights,
                           row.names = rownames(CSDperceptions),
                           row.heading = names(dimnames(CSDperceptions))[1],
                           col.names = colnames(CSDperceptions),
                           col.heading = names(dimnames(CSDperceptions))[2],
                           prefix = prefix,
                           suffix = suffix,
                           tooltips = TRUE,
                           colors = colorVec,
                           column.as.heights = 1)

# test cases
# prefix suffix ylabel
rhtmlPalmTrees::rhtmlPalmTrees(data = CSDperceptions)
rhtmlPalmTrees::rhtmlPalmTrees(data = CSDperceptions,
                           colors = colorVec)
rhtmlPalmTrees::rhtmlPalmTrees(data = CSDperceptions,prefix = prefix,
                           colors = colorVec)
rhtmlPalmTrees::rhtmlPalmTrees(data = CSDperceptions,suffix = suffix,
                           colors = colorVec)
rhtmlPalmTrees::rhtmlPalmTrees(data = CSDperceptions,prefix = prefix,suffix = suffix,
                           colors = colorVec)
rhtmlPalmTrees::rhtmlPalmTrees(data = CSDperceptions,ylab = "Ylabel Text",
                           colors = colorVec)
rhtmlPalmTrees::rhtmlPalmTrees(data = CSDperceptions,ylab = "Ylabel Text",prefix = prefix,
                           colors = colorVec)
rhtmlPalmTrees::rhtmlPalmTrees(data = CSDperceptions,ylab = "Ylabel Text",suffix = suffix,
                           colors = colorVec)
rhtmlPalmTrees::rhtmlPalmTrees(data = CSDperceptions,ylab = "Ylabel Text",prefix = prefix,suffix = suffix,
                           colors = colorVec)

# row name col names y heading
rhtmlPalmTrees::rhtmlPalmTrees(data = CSDperceptions,row.names = rownames(CSDperceptions),
                           colors = colorVec)
rhtmlPalmTrees::rhtmlPalmTrees(data = CSDperceptions,row.heading = names(dimnames(CSDperceptions))[1],
                           colors = colorVec)
rhtmlPalmTrees::rhtmlPalmTrees(data = CSDperceptions,col.names = colnames(CSDperceptions),
                           colors = colorVec)
rhtmlPalmTrees::rhtmlPalmTrees(data = CSDperceptions,col.heading = names(dimnames(CSDperceptions))[2],
                           colors = colorVec)
rhtmlPalmTrees::rhtmlPalmTrees(data = CSDperceptions,row.names = rownames(CSDperceptions),col.names = colnames(CSDperceptions),
                           colors = colorVec)
rhtmlPalmTrees::rhtmlPalmTrees(data = CSDperceptions,row.names = rownames(CSDperceptions),col.names = colnames(CSDperceptions),
                           colors = colorVec)

rhtmlPalmTrees::rhtmlPalmTrees(data = CSDperceptions,col.names = col.names,
                           colors = colorVec)


library(flipData)
x = GetTidyTwoDimensionalArray()

CSD <- matrix(c(0.06, 0.02, 0.09, 0.65, 0.23, 0.26, 0.09, 0.92, 0.01,
                           c( 0.57, 0.59, 0.23, 0.22, 0.09, 0.05, 0.24, 0.15, 0.76),
                           c( 0.22, 0.55, 0.13, 0.05, 0.52, 0.31, 0.09, 0.03, 0.65),
                           c( 0.09, 0.02, 0.1, 0.38, 0.16, 0.18, 0.14, 0.54, 0.0),
                           c( 0.61, 0.58, 0.43, 0.09, 0.16, 0.04, 0.3, 0.03, 0.76),
                           c( 0.1, 0.31, 0.07, 0.06, 0.5, 0.45, 0.06, 0.04, 0.41),
                           c( 0.1, 0.17, 0.3, 0.09, 0.12, 0.16, 0.39, 0.03, 0.06)),nrow=7,byrow=TRUE,
                         dimnames=list(Brand=c('Coke','Diet Coke',"Coke Zero","Pepsi",'Diet Pepsi','Pepsi Max','None of these'),
                                       Attribute=c('Feminine', 'Health-conscious', "Innocent", 'Older', 'Open to new experiences', 'Rebellious', 'Sleepy', 'Traditional', 'Weight-conscious')))
n.col = ncol(CSD)
CSD = CSD*100
CSD = CSD / n.col
rowSums(CSD)

rhtmlPalmTrees::PalmTrees(data = CSD*100,
                          weights = rep(1/n.col, n.col),
                          prefix = "",
                          suffix = "%",
                          digits = 1,
                          y.digits = 1,
                          tooltips = TRUE,
                          colors = colorVec[1:n.col])


library(rvest)
page = read_html("https://en.wikipedia.org/wiki/List_of_U.S._states_by_life_expectancy")

tble = page %>% html_node(".wikitable") %>% html_table(fill=T)

rnames <- tble[, 1]

tble = tble[, -1:-2]

tble <- as.data.frame(tble)
rownames(tble) <- rnames

for (i in seq_along(tble))
    tble[,i] <- as.numeric(tble[, i])

tble1 <- tble[complete.cases(tble), ]
library(rhtmlPalmTrees)
PalmTrees(data = tble)
PalmTrees(data = tble1)


# single number
a = 1
PalmTrees(data = a)
# vector
b = c(1,2,3,4,5)
bb = b
bb[2] = NA
PalmTrees(data = b)
PalmTrees(data = bb)
# list
c = list(1,2,3,4,5)
PalmTrees(data = c)
# matrix
d = matrix(runif(24), nrow = 4)
dd = matrix(as.character(runif(24)), nrow = 4)
ddd = matrix(letters[1:24], nrow = 4)
PalmTrees(data = d)
PalmTrees(data = dd)
PalmTrees(data = ddd)
# data frame
e = data.frame(matrix(runif(24), nrow = 4))
ee = data.frame(matrix(letters[1:24], nrow = 4), stringsAsFactors = FALSE)
PalmTrees(data = e)
PalmTrees(data = ee)

input.table <- structure(c(6.125, 57.125, 22.375, 8.875, 61.5, 9.375, 9.25,
                           100, 2, 57.75, 53.5, 2.5, 57.875, 30.625, 17.375, 100, 10.5,
                           21.625, 11.375, 10, 44.625, 6.875, 29.875, 100, 64.625, 22.5,
                           5.375, 39, 9.875, 6.75, 7.25, 100, 22.375, 8.875, 50.625, 16.75,
                           16.625, 49.25, 12.875, 100, 25.5, 4.75, 64, 17.75, 3.75, 44.75,
                           15.25, 100, 9.5, 23.25, 9.75, 13.5, 29.75, 5.5, 38.875, 100,
                           91.25, 14.625, 3, 54.75, 3.75, 4.375, 2.5, 100, 0.5, 76.125,
                           63.875, 0, 76.625, 40.375, 5.75, 100, 98, 91.5, 94.875, 79.625,
                           94.75, 86.375, 57.5, 100), .Dim = c(8L, 10L), statistic = "%", .Dimnames = list(
                               c("Coke", "Diet Coke", "Coke Zero", "Pepsi", "Diet Pepsi",
                                 "Pepsi Max", "None of these", "NET"), c("Feminine", "Health-conscious",
                                                                         "Innocent", "Older", "Open to new experiences", "Rebellious",
                                                                         "Sleepy", "Traditional", "Weight-conscious", "NET")), name = "q5", questions = c("q5",
                                                                                                                                                          "SUMMARY"))




row.names.to.remove <- unlist(strsplit("", ","))
column.names.to.remove <- unlist(strsplit("NET, Total, SUM", ","))
x <- flipData::GetTidyTwoDimensionalArray(input.table, row.names.to.remove, column.names.to.remove)
data("qColors", package = "flipExampleData")
colorVec = substring(qColors,1,7)

n.col <- ncol(x)
stat <- attr(input.table, "statistic")
suffix <- ifelse(!is.null(stat) && stat == "%", "%", "")
rhtmlPalmTrees::PalmTrees(data = x,
                                         weights = rep(1 / n.col, n.col),
                                         row.names = dimnames(x)[[1]],
                                         row.heading = "",
                                         col.names = dimnames(x)[[2]],
                                         col.heading = "",
                                         prefix = "",
                                         suffix = suffix,
                                         tooltips = "Default",
                                         colors = colorVec)

x = matrix(c(4,3,2,1,.5,.5,.5,.5), nrow = 4)
qColors <- c(grDevices::rgb(91, 155, 213, 255, max = 255), # blue
             grDevices::rgb(237, 125, 49, 255, max = 255), # orange
             grDevices::rgb(165, 165, 165, 255, max = 255), # grey
             grDevices::rgb(30, 192, 0, 255, max = 255), # yelow
             grDevices::rgb(68, 114, 196, 255, max = 255), # darker blue
             grDevices::rgb(112, 173, 71, 255, max = 255), # green
             grDevices::rgb(37, 94, 145, 255, max = 255), # even darker blue
             grDevices::rgb(158, 72, 14, 255, max = 255), # blood
             grDevices::rgb(99, 99, 99, 255, max = 255), # dark grey
             grDevices::rgb(153, 115, 0, 255, max = 255), # brown
             grDevices::rgb(38, 68, 120, 255, max = 255), # very dark blue
             grDevices::rgb(67, 104, 43, 255, max = 255), # darker green
             grDevices::rgb(255, 255, 255, 255, max = 255), # black
             grDevices::rgb(255, 35, 35, 255, max = 255)) # red
colorVec = substring(qColors,1,7)
rhtmlPalmTrees::PalmTrees(data = x, colors = colorVec)
