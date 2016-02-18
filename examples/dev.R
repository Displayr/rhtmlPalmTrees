
# library(devtools)
# install_github("xtmwang/PalmTreePlot")
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

CSDperceptions <- matrix(c(0.3004, 0.6864, 0.4975, 0.2908, 0.2781, 0.2642, 0.1916, 0.284, 0.3514, 0.2534, 0.2089,
                           c( 0.0198, 0.4604, 0.2151, 0.5235, 0.1151, 0.12, 0.5457, 0.3041, 0.06312, 0.384, 0.06064),
                           c( 0.01114, 0.4111, 0.1904, 0.4494, 0.06931, 0.1112, 0.4716, 0.2859, 0.0495, 0.3296, 0.03837),
                           c( 0.01114, 0.2373, 0.089, 0.2707, 0.05322, 0.06436, 0.2756, 0.1656, 0.02967, 0.1916, 0.02228),
                           c( 0.0198, 0.177, 0.07054, 0.0297, 0.0396, 0.02719, 0.0136, 0.02847, 0.0198, 0.02847, 0.02472),
                           c( 0.4543, 0.1275, 0.07673, 0.02847, 0.07293, 0.1077, 0.01609, 0.05198, 0.321, 0.01856, 0.0297),
                           c( 0.06807, 0.1089, 0.06064, 0.0198, 0.1174, 0.04084, 0.01609, 0.01733, 0.03465, 0.01361, 0.03589),
                           c( 0.08168, 0.224, 0.1015, 0.04579, 0.04815, 0.04084, 0.03094, 0.05562, 0.05322, 0.04084, 0.02847)),nrow=8,byrow=TRUE,
                         dimnames=list(Brand=c('Coke','V',"Red Bull","Lift Plus",'A very very long brand name','Fanta','Lift','Pepsi'),
                                       Attribute=c('Kids', 'Teens', "Enjoy life", 'Picks you up', 'Refreshessssssssssssssssss', 'Cheers you up', 'Energy', 'Up-to-date', 'Fun', 'When tired', 'Relax')))


set.seed(123)
# weights = runif(ncol(CSDperceptions))
# weights = weights/sum(weights)

weights = rep(1,ncol(CSDperceptions))
description = dimnames(CSDperceptions)

row.heading = "Brand"
col.heading = "Attribute"
row.names = description[[1]]
col.names = description[[2]]

### test cases
### testing column names
# test case 1: long column names, short heading
col.names = description[[2]]
# test case 2: short column names, long heading
col.names = c("A","B","C","D","E","F","G","H","I","J","H")

### testing row and column names in a different language
row.heading = "品牌"
col.heading = "属性"
row.names = c('可口可乐','V',"红牛","Lift Plus",'健怡可乐','芬达','Lift','百事')
col.names = c("一","二","三","四","五","六","七","八","九","十","十一")

### testing units
# test case 1: both prefix and suffix
prefix = "$$$"
suffix = "per day day"
# test case 2: both prefix and suffix
prefix = "A$"
suffix = "/min"
# test case 4: no prefix, has suffix
prefix = "$$$"
suffix = "dog"
# test case 3: no prefix, has suffix
prefix = ""
suffix = "%"
# test case 4: no prefix, has suffix
prefix = "@#$"
suffix = "dog"

prefix = "ill"
suffix = "dog"

PalmTreePlot::PalmTreePlot(data = CSDperceptions,
                           weights = weights,
                           row.names = rownames(CSDperceptions),
                           row.heading = names(dimnames(CSDperceptions))[1],
                           col.names = colnames(CSDperceptions),
                           col.heading = names(dimnames(CSDperceptions))[2],
                           prefix = prefix,
                           suffix = suffix,
                           tooltips = "Default",
                           colors = colorVec)

PalmTreePlot::PalmTreePlot(data = CSDperceptions,
                           weights = weights,
                           row.names = rownames(CSDperceptions),
                           row.heading = names(dimnames(CSDperceptions))[1],
                           col.names = colnames(CSDperceptions),
                           col.heading = names(dimnames(CSDperceptions))[2],
                           ylab = "Sum of Columns",
                           prefix = prefix,
                           suffix = suffix,
                           tooltips = "Default",
                           colors = colorVec)

PalmTreePlot::PalmTreePlot(data = CSDperceptions,
                           weights = weights,
                           row.names = NULL,
                           row.heading = NULL,
                           col.names = NULL,
                           col.heading = "ddddddddddddddddddddd",
                           ylab = "Sum of Columns",
                           prefix = prefix,
                           suffix = suffix,
                           tooltips = "Default",
                           colors = colorVec)

PalmTreePlot::PalmTreePlot(data = CSDperceptions,
                           weights = weights,
                           row.names = dimnames(CSDperceptions)[[1]],
                           row.heading = NULL,
                           col.names = 1:10,
                           col.heading = names(dimnames(CSDperceptions))[2],
                           tooltips = "Default",
                           colors = colorVec)


PalmTreePlot::PalmTreePlot(data = CSDperceptions,
                           colors = colorVec)
PalmTreePlot::PalmTreePlot(data = CSDperceptions,prefix = prefix,
                           colors = colorVec)
PalmTreePlot::PalmTreePlot(data = CSDperceptions,suffix = suffix,
                           colors = colorVec)
PalmTreePlot::PalmTreePlot(data = CSDperceptions,prefix = prefix,suffix = suffix,
                           colors = colorVec)
PalmTreePlot::PalmTreePlot(data = CSDperceptions,ylab = "Ylabel Text",
                           colors = colorVec)
PalmTreePlot::PalmTreePlot(data = CSDperceptions,ylab = "Ylabel Text",prefix = prefix,
                           colors = colorVec)
PalmTreePlot::PalmTreePlot(data = CSDperceptions,ylab = "Ylabel Text",suffix = suffix,
                           colors = colorVec)
PalmTreePlot::PalmTreePlot(data = CSDperceptions,ylab = "Ylabel Text",prefix = prefix,suffix = suffix,
                           colors = colorVec)
# row name col names y heading
PalmTreePlot::PalmTreePlot(data = CSDperceptions,prefix = prefix,suffix = suffix,row.names = rownames(CSDperceptions),
                           colors = colorVec)
PalmTreePlot::PalmTreePlot(data = CSDperceptions,prefix = prefix,suffix = suffix,col.names = colnames(CSDperceptions),
                           colors = colorVec)
PalmTreePlot::PalmTreePlot(data = CSDperceptions,prefix = prefix,suffix = suffix,ylab = "Ylabel Text",
                           colors = colorVec)
PalmTreePlot::PalmTreePlot(data = CSDperceptions,prefix = prefix,suffix = suffix,row.names = rownames(CSDperceptions),col.names = colnames(CSDperceptions),
                           colors = colorVec)
