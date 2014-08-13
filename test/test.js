'use strict';

var gulp = require('gulp');
var gutil = require('gulp-util');
var soynode = require('../index');
var path = require('path');

module.exports = {
  testCompileTemplatesGlobpath: function(test) {
    gulp.src(['test/assets/**/*.soy', '!test/assets/foo/soyweb.soy', '!test/assets/static/*.soy'])
      .pipe(soynode())
      .pipe(gutil.buffer(function(err, files) {
        test.equal(files.length, 4);
        assertFilepath(test, files[0], 'valid.soy');
        assertFilepath(test, files[1], 'valid.soy.js');
        assertFilepath(test, files[2], 'foo/valid.soy');
        assertFilepath(test, files[3], 'foo/valid.soy.js');
        assertFilesize(test, files[0], 96);
        assertFilesize(test, files[1], 346);
        assertFilesize(test, files[2], 95);
        assertFilesize(test, files[3], 343);
        test.done();
      }));
  },

  testCompileTemplatesFullpath: function(test) {
    gulp.src([__dirname + '/assets/valid.soy', __dirname + '/assets/foo/valid.soy'])
      .pipe(soynode())
      .pipe(gutil.buffer(function(err, files) {
        test.equal(files.length, 4);
        assertFilepath(test, files[0], 'valid.soy');
        assertFilepath(test, files[1], 'valid.soy.js');
        assertFilepath(test, files[2], 'valid.soy');
        assertFilepath(test, files[3], 'valid.soy.js');
        assertFilesize(test, files[0], 96);
        assertFilesize(test, files[1], 346);
        assertFilesize(test, files[2], 95);
        assertFilesize(test, files[3], 343);
        test.done();
      }));
  },

  testCompileTemplatesMixedpath: function(test) {
    gulp.src(['test/assets/valid.soy', '!test/assets/static/static.soy', __dirname + '/assets/foo/valid.soy'])
      .pipe(soynode())
      .pipe(gutil.buffer(function(err, files) {
        test.equal(files.length, 4);
        assertFilepath(test, files[0], 'valid.soy');
        assertFilepath(test, files[1], 'valid.soy.js');
        assertFilepath(test, files[2], 'valid.soy');
        assertFilepath(test, files[3], 'valid.soy.js');
        assertFilesize(test, files[0], 96);
        assertFilesize(test, files[1], 346);
        assertFilesize(test, files[2], 95);
        assertFilesize(test, files[3], 343);
        test.done();
      }));
  },

  testCompileTemplatesSoyWeb: function(test) {
    gulp.src(['test/assets/static/soyweb.soy', 'test/assets/foo/soyweb.soy', 'test/assets/valid.soy'])
      .pipe(soynode({
        renderSoyWeb: true
      }))
      .pipe(gutil.buffer(function(err, files) {
        test.equal(files.length, 4);
        assertFilepath(test, files[0], 'soyweb.html');
        assertFilepath(test, files[1], 'soyweb.html');
        assertFilepath(test, files[2], 'valid.soy');
        assertFilepath(test, files[3], 'valid.soy.js');
        assertFilesize(test, files[0], 520);
        assertFilesize(test, files[1], 520);
        assertFilesize(test, files[2], 96);
        assertFilesize(test, files[3], 346);
        test.done();
      }));
  },

  testMessageExtraction: function(test) {
    gulp.src(['test/assets/valid.soy'])
      .pipe(soynode.lang())
      .pipe(gutil.buffer(function(err, files) {
        test.equal(files.length, 1);
        test.equal(path.extname(files[0].path), '.xlf');
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
