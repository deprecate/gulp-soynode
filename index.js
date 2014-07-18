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
  options.outputDir = path.resolve(process.cwd(), options.outputDir || '/tmp/soynode');

  var filepaths = [];
  var pauseStream = ps();

  return new Combine(
    through.obj(spyFilePathsThrough(filepaths, pauseStream)),
    pauseStream.pause(),
    through.obj(function() {
      var stream = this;

      if (options.allowDynamicRecompile) {
        this.emit('error', new gutil.PluginError('gulp-soynode', 'Option `allowDynamicRecompile` is not supported, use `gulp.watch` instead.'));
      }

      soynode.setOptions(options);
      soynode.compileTemplateFiles(filepaths, function(err) {
        if (err) {
          this.emit('error', new gutil.PluginError('gulp-soynode', err));
        }

        filepaths.forEach(function(filepath) {
          var soypath = gutil.replaceExtension(filepath, '.soy.js');
          var file = new gutil.File({
            contents: fs.readFileSync(path.join(options.outputDir, soypath)),
            path: soypath
          });
          stream.emit('data', file);
        });

        stream.emit('end');
      });
    })
  );
};

/**
 * Spy files through stream and buffer their paths into `filepaths` array
 * reference. When the stream emits `finish` event the stream is resumed
 * automatically and the flow is continued.
 * @param {Array} filepaths Empty array to buffer paths captured by the spy.
 * @param {Stream} pauseStream Pause stream that controls the flow.
 */
function spyFilePathsThrough(filepaths, pauseStream) {
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
    file.path = path.relative(file.cwd, file.path);
    filepaths.push(file.path);
    this.push(file);
    cb();
  };
}
