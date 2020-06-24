context("Test palm trees")

data <- structure(c(25.0764525993884, 25.6880733944954, 27.3846153846154,
            23.9263803680982, 27.6923076923077, 19.9386503067485, 0, 0.305810397553517,
            0.307692307692308, 0.613496932515337, 0, 0, 0, 0, 0, 0, 0, 0.920245398773006,
            28.7461773700306, 22.0183486238532, 22.4615384615385, 22.6993865030675,
            15.0769230769231, 23.6196319018405, 7.03363914373089, 19.8776758409786,
            15.3846153846154, 16.5644171779141, 23.6923076923077, 17.7914110429448,
            14.3730886850153, 20.4892966360856, 20.9230769230769, 19.3251533742331,
            23.6923076923077, 17.7914110429448, 5.81039755351682, 4.28134556574923,
            2.76923076923077, 2.45398773006135, 3.38461538461538, 3.68098159509202,
            4.28134556574923, 1.8348623853211, 1.53846153846154, 2.14723926380368,
            2.46153846153846, 0.920245398773006, 5.19877675840979, 2.75229357798165,
            4, 5.52147239263804, 2.15384615384615, 8.58895705521472, 2.75229357798165,
            1.52905198776758, 2.46153846153846, 4.29447852760736, 0.615384615384615,
            3.37423312883436, 3.05810397553517, 0.917431192660551, 2.15384615384615,
            2.14723926380368, 0.923076923076923, 3.37423312883436, 3.6697247706422,
            0.305810397553517, 0.615384615384615, 0.306748466257669, 0.307692307692308,
            0, 100, 100, 100, 100, 100, 100), statistic = "Row %", .Dim = c(6L, 13L),
          .Dimnames = list(c("Coke", "Diet Coke", "Coke Zero", "Pepsi", "Diet Pepsi", "Pepsi Max"),
                           c("Functional", "Price: Expensive",  "Price: Inexpensive",
                             "Evaluative: Positive", "Evaluative: Negative",  "Other", "Reliable",
                             "Fun", "Energising", "Sexy", "Strong", "Classic", "NET")))

test_that("Basic working palmtree", {
    expect_error(PalmTrees(data), NA)
})

test_that("Newlines in labels", {
    newline.data <- data
    colnames(newline.data)[2] <- "Price:\r\nExpensive"
    rownames(newline.data)[3] <- "Coke\nZero"
    expect_error(pt <- PalmTrees(newline.data), NA)
    expect_equal(pt$x$settings$colNames[2], "Price: Expensive")
    expect_equal(pt$x$settings$rowNames[3], "Coke Zero")
})

test_that("NAs in data", {
    na.data <- data
    na.data[, 1] <- NA
    expect_error(pt <- PalmTrees(na.data), NA)
    expect_true(all(is.nan(pt$x$data[,1])))
})

