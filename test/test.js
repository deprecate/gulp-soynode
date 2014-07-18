'use strict';

var gulp = require('gulp');
var gutil = require('gulp-util');
var soynode = require('../index');

module.exports = {
  testCompileTemplates: function(test) {
    gulp.src([__dirname + '/valid.soy', '/tmp/invalid.soy'])
      .pipe(soynode())
      .pipe(gutil.buffer(function(err, files) {
        test.equal(files.length, 1);
        test.equal(files[0].path, 'test/valid.soy.js');
        test.equal(files[0].contents.length, 346);
        test.done();
      }));
  }
};
