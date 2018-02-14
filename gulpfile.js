const gulp = require('gulp')
const rhtmlBuildUtils = require('rhtmlBuildUtils')

// const dontRegisterTheseTasks = ['testSpecs']
const dontRegisterTheseTasks = []
rhtmlBuildUtils.registerGulpTasks({ gulp, exclusions: dontRegisterTheseTasks })

// gulp.task('testSpecs', function () {
//   console.log('skipping test')
//   return true
// })
