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

  // Resolve internal options.
  var optionsInternal = {};
  optionsInternal.renderSoyWeb = options.renderSoyWeb;
  optionsInternal.renderSoyWebFileExtension = options.renderSoyWebFileExtension || '.html';
  delete options.renderSoyWeb;
  delete options.renderSoyWebFileExtension;

  // Resolve soynode options.
  var optionsSoynode = options;
  optionsSoynode.uniqueDir = false;
  optionsSoynode.outputDir = path.resolve(options.outputDir || '/tmp/soynode');

  var files = [];
  var pauseStream = ps();

  return new Combine(
    through.obj(spyFileThrough(files)).on('finish', pauseStream.resume),
    pauseStream.pause(),
    through.obj(function() {
      // Discourage usage of `allowDynamicRecompile` option.
      if (optionsSoynode.allowDynamicRecompile) {
        this.emit('error', new gutil.PluginError('gulp-soynode', 'Option `allowDynamicRecompile` is not supported, use `gulp.watch` instead.'));
      }
      // When rendering soyweb templates make sure to load compiled templates.
      if (optionsInternal.renderSoyWeb) {
        if (optionsSoynode.loadCompiledTemplates === false) {
          this.emit('error', new gutil.PluginError('gulp-soynode', 'Option `renderSoyWeb` requires `loadCompiledTemplates` to be enabled.'));
        }
      }

      var stream = this;
      var filepaths = files.map(function(file) {
        return path.relative(file.cwd, file.path);
      });

      soynode.setOptions(optionsSoynode);
      soynode.compileTemplateFiles(filepaths, function(err) {
        if (err) {
          this.emit('error', new gutil.PluginError('gulp-soynode', err));
        }
        files.forEach(function(file) {
          var relative = path.relative(file.cwd, file.path);
          var soypath = gutil.replaceExtension(relative, '.soy.js');
          var compiled = new gutil.File({
            base: file.base,
            contents: fs.readFileSync(path.join(optionsSoynode.outputDir, soypath)),
            cwd: file.cwd,
            path: gutil.replaceExtension(file.path, '.soy.js')
          });

          if (optionsInternal.renderSoyWeb) {
            try {
              // When building a static SoyWeb template make sure to only emit
              // the output file, no need to emit the .soy and .soy.js.
              file = renderSoyWeb(file, optionsInternal);
              compiled = null;
            } catch(err) {}
          }

          stream.emit('data', file);

          if (compiled) {
            stream.emit('data', compiled);
          }
        });
        stream.emit('end');
      });
    })
  );
};

/**
 * This method allows templates to be rendered by SoyWeb. It deliberately
 * includes dummy data so the designer can get a feel for how the task list
 * will appear with real data rather with minimal copy and paste. For more
 * information visit: http://plovr.com/soyweb.html
 * @param {File} file The soy template file.
 * @param {object} optionsInternal
 * @return {File} Returns a file containing the rendered SoyWeb content.
 */
function renderSoyWeb(file, optionsInternal) {
  var namespace = lookupNamespace(file.contents.toString());
  var rendered = new gutil.File({
    base: file.base,
    contents: new Buffer(soynode.render(namespace + '.soyweb')),
    cwd: file.cwd,
    path: gutil.replaceExtension(file.path, optionsInternal.renderSoyWebFileExtension)
  });
  return rendered;
}

/**
 * Lookups namespace from template content.
 * @param {string} contents
 * @return {string} The template namespace
 */
function lookupNamespace(contents) {
  var startToken = '{namespace ';
  var startPos = contents.indexOf(startToken);
  var namespace = contents.substring(startPos + startToken.length, contents.indexOf('}'));
  var spacePos = namespace.indexOf(' ');
  if (spacePos > -1) {
    namespace = namespace.substring(0, spacePos);
  }
  return namespace;
}

/**
 * Spy files through stream and buffer into `files` array
 * reference. When the stream emits `finish` event the stream is resumed
 * automatically and the flow is continued.
 * @param {Array} files Empty array to buffer files captured by the spy.
 */
function spyFileThrough(files) {
  return function(file, enc, cb) {
    if (file.isNull()) {
      this.push(file);
      return cb();
    }

    if (file.isStream()) {
      this.emit('error', new gutil.PluginError('gulp-soynode', 'Streaming not supported'));
      return cb();
    }

    files.push(file);
    this.push(file);
    cb();
  };
}
