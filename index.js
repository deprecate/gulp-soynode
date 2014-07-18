'use strict';

var Combine = require('stream-combiner');
var fs = require('fs');
var gutil = require('gulp-util');
var path = require('path');
var ps = require('pause-stream');
var soynode = require('soynode');
var through = require('through2');

module.exports = function(options) {
  options = options || {};
  options.uniqueDir = false;
  options.loadCompiledTemplates = false;
  options.outputDir = path.resolve(options.outputDir || '/tmp/soynode');

  var files = [];
  var pauseStream = ps();

  return new Combine(
    through.obj(spyFileThrough(files, pauseStream)),
    pauseStream.pause(),
    through.obj(function() {
      var stream = this;

      if (options.allowDynamicRecompile) {
        this.emit('error', new gutil.PluginError('gulp-soynode', 'Option `allowDynamicRecompile` is not supported, use `gulp.watch` instead.'));
      }

      var filepaths = files.map(function(file) {
        return path.relative(file.cwd, file.path);
      });

      soynode.setOptions(options);
      soynode.compileTemplateFiles(filepaths, function(err) {
        if (err) {
          this.emit('error', new gutil.PluginError('gulp-soynode', err));
        }

        files.forEach(function(file) {
          var relative = path.relative(file.cwd, file.path);
          var soypath = gutil.replaceExtension(relative, '.soy.js');
          file.contents = fs.readFileSync(path.join(options.outputDir, soypath));
          file.path = gutil.replaceExtension(file.path, '.soy.js');
          stream.emit('data', file);
        });

        stream.emit('end');
      });
    })
  );
};

/**
 * Spy files through stream and buffer into `files` array
 * reference. When the stream emits `finish` event the stream is resumed
 * automatically and the flow is continued.
 * @param {Array} files Empty array to buffer files captured by the spy.
 * @param {Stream} pauseStream Pause stream that controls the flow.
 */
function spyFileThrough(files, pauseStream) {
  return function(file, enc, cb) {
    if (file.isNull()) {
      this.push(file);
      return cb();
    }

    if (file.isStream()) {
      this.emit('error', new gutil.PluginError('gulp-soynode', 'Streaming not supported'));
      return cb();
    }

    this.on('finish', pauseStream.resume);
    files.push(file);
    this.push(file);
    cb();
  };
}
