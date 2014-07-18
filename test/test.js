'use strict';

var gulp = require('gulp');
var gutil = require('gulp-util');
var soynode = require('../index');
var path = require('path');

module.exports = {
  testCompileTemplatesGlobpath: function(test) {
    gulp.src('test/assets/**/*.soy')
      .pipe(soynode())
      .pipe(gutil.buffer(function(err, files) {
        test.equal(files.length, 2);
        assertFilepath(test, files[0], 'valid.soy.js');
        assertFilepath(test, files[1], 'foo/valid.soy.js');
        assertFilesize(test, files[0], 346);
        assertFilesize(test, files[1], 343);
        test.done();
      }));
  },

  testCompileTemplatesFullpath: function(test) {
    gulp.src([__dirname + '/assets/valid.soy', __dirname + '/assets/foo/valid.soy'])
      .pipe(soynode())
      .pipe(gutil.buffer(function(err, files) {
        test.equal(files.length, 2);
        assertFilepath(test, files[0], 'valid.soy.js');
        assertFilepath(test, files[1], 'valid.soy.js');
        assertFilesize(test, files[0], 346);
        assertFilesize(test, files[1], 343);
        test.done();
      }));
  },

  testCompileTemplatesMixedpath: function(test) {
    gulp.src(['test/assets/*.soy', __dirname + '/assets/foo/valid.soy'])
      .pipe(soynode())
      .pipe(gutil.buffer(function(err, files) {
        test.equal(files.length, 2);
        assertFilepath(test, files[0], 'valid.soy.js');
        assertFilepath(test, files[1], 'valid.soy.js');
        assertFilesize(test, files[0], 346);
        assertFilesize(test, files[1], 343);
        test.done();
      }));
  }
};

function assertFilepath(test, file, expected) {
  test.equal(path.relative(file.base, file.path), expected);
}

function assertFilesize(test, file, expected) {
  test.equal(file.contents.length, expected);
}
