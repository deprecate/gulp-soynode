'use strict';

var gulp = require('gulp');
var nodeunit = require('gulp-nodeunit');

gulp.task('test', function() {
  return gulp.src('test/test.js').pipe(nodeunit());
});
