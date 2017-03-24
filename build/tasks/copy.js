const gulp = require('gulp');
const rename = require('gulp-rename');

gulp.task('copy', function () {
  // gulp.src([
  //   'theSrc/internal_www/**/*.html',
  //   'theSrc/internal_www/**/*.css',
  // ], {}).pipe(gulp.dest('browser'));

  // gulp.src([
  //   'theSrc/internal_www/js/*.js',
  // ], {}).pipe(gulp.dest('browser/js'));
  
  // gulp.src([
  //   'theSrc/images/**/*',
  // ], {}).pipe(gulp.dest('browser/images'));

  gulp.src('theSrc/R/htmlwidget.yaml')
    .pipe(rename(`${gulp.context.widgetName}.yaml`))
    .pipe(gulp.dest('inst/htmlwidgets/'));

  gulp.src('theSrc/R/htmlwidget.R')
    .pipe(rename(`${gulp.context.widgetName}.R`))
    .pipe(gulp.dest('R/'));

  gulp.src([
    'theSrc/scripts/*.js',
  ], {}).pipe(gulp.dest('inst/htmlwidgets'));

  gulp.src([
    'theSrc/scripts/lib/*.js',
  ], {}).pipe(gulp.dest('inst/htmlwidgets/lib'));

  gulp.src([
    'theSrc/scripts/data/*.js',
  ], {}).pipe(gulp.dest('inst/htmlwidgets/data'));

  gulp.src([
    'theSrc/styles/*.css',
  ], {}).pipe(gulp.dest('inst/htmlwidgets/lib/style'));

  gulp.src([
    'theSrc/scripts/*.js',
  ], {}).pipe(gulp.dest('theSrc/internal_www/js'));

  gulp.src([
    'theSrc/scripts/lib/*.js',
  ], {}).pipe(gulp.dest('theSrc/internal_www/js/lib'));

  gulp.src([
    'theSrc/scripts/not_to_copy/*.js',
  ], {}).pipe(gulp.dest('theSrc/internal_www/js/lib'));

  gulp.src([
    'theSrc/scripts/data/*.js',
  ], {}).pipe(gulp.dest('theSrc/internal_www/js/data'));

  gulp.src([
    'theSrc/styles/*.css',
  ], {}).pipe(gulp.dest('theSrc/internal_www/style'));

});
