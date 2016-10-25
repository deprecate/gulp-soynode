'use strict';

var Combine = require('stream-combiner');
var closureTemplates = require('closure-templates');
var fs = require('fs');
var gutil = require('gulp-util');
var path = require('path');
var soynode = require('soynode');
var spawn = require('child_process').spawn;
var through = require('through2');

var PATH_TO_MSG_EXTRACTOR = closureTemplates['SoyMsgExtractor.jar'];

var gulpSoynode = function(options) {
  options = options || {};

  // Resolve internal options.
  var optionsInternal = {};
  optionsInternal.renderSoyWeb = options.renderSoyWeb;
  optionsInternal.renderSoyWebContext = options.renderSoyWebContext;
  optionsInternal.renderSoyWebInjectedData = options.renderSoyWebInjectedData || {};
  optionsInternal.renderSoyWebFileExtension = options.renderSoyWebFileExtension || '.html';
  delete options.renderSoyWeb;
  delete options.renderSoyWebContext;
  delete options.renderSoyWebInjectedData;
  delete options.renderSoyWebFileExtension;

  // Resolve soynode options.
  var optionsSoynode = options;
  optionsSoynode.uniqueDir = false;
  optionsSoynode.outputDir = path.resolve(options.outputDir || '/tmp/soynode');

  return new Combine(
    gutil.buffer(),
    through.obj(function(files, enc, cb) {
      // Discourage usage of `allowDynamicRecompile` option.
      if (optionsSoynode.allowDynamicRecompile) {
        this.emit('error', new gutil.PluginError(
        'gulp-soynode',
        'Option `allowDynamicRecompile` is not supported, use `gulp.watch` instead.'));
      }

      // When rendering soyweb templates make sure to load compiled templates.
      if (optionsInternal.renderSoyWeb) {
        if (optionsSoynode.loadCompiledTemplates === false) {
          this.emit('error', new gutil.PluginError(
          'gulp-soynode',
          'Option `renderSoyWeb` requires `loadCompiledTemplates` to be enabled.'));
        }
      }

      compileFiles(this, files, optionsInternal, optionsSoynode, cb);
    }));
};

/**
 * Extracts messages from the given soy template files.
 * @param {object} options
 */
gulpSoynode.lang = function(options) {
  options = options || {};

  return new Combine(
    gutil.buffer(),
    through.obj(function(files, enc, cb) {
      var stream = this;
      var outputFile = options.outputFile || '/tmp/soynode/translations.xlf';

      var args = [
        '-jar', PATH_TO_MSG_EXTRACTOR,
        '--outputFile', outputFile
      ];
      args = args.concat(getFilePaths(files));

      var process = spawn('java', args);
      process.on('exit', function (err) {
        if (err) {
          stream.emit('error', new gutil.PluginError('gulp-soynode', err));
          stream.emit('end');
          cb();
          return;
        }

        var translationFile = new gutil.File({
          contents: fs.readFileSync(outputFile),
          path: outputFile
        });

        stream.emit('data', translationFile);
        stream.emit('end');
        cb();
      });
    })
  );
};


/**
 * Compiles buffered files from a through stream.
 * @param {Stream} stream
 * @param {array} files Buffered files array.
 * @param {object} optionsInternal
 * @param {object} optionsSoynode
 * @param {function} cb
 */
function compileFiles(stream, files, optionsInternal, optionsSoynode, cb) {
  var filepaths = getFilePaths(files);

  soynode.setOptions(optionsSoynode);
  soynode.compileTemplateFiles(filepaths, function(err) {
    if (err) {
      stream.emit('error', new gutil.PluginError('gulp-soynode', err));
      return;
    }

    var locales = optionsSoynode.locales || [''];

    files.forEach(function(file) {
      var soyFileAlreadyEmitted = false;
      var extname = path.extname(file.path);
      var relative = path.relative(file.cwd, path.dirname(file.path));
      var basename = path.basename(file.path, extname);
      var base = file.base;

      locales.forEach(function(locale) {
        var relativePath = path.join(relative, basename) + ((locales.length > 1 && locale) ? '_' + locale : '') + extname + '.js';

        var compiled = new gutil.File({
          base: base,
          contents: fs.readFileSync(path.join(optionsSoynode.outputDir, relativePath)),
          cwd: file.cwd,
          path: path.resolve(file.base, path.relative(file.base, relativePath))
        });

        if (optionsInternal.renderSoyWeb) {
          try {
            // When building a static SoyWeb template make sure to only emit
            // the output file, no need to emit the .soy and .soy.js.
            file = renderSoyWeb(file, optionsInternal, optionsSoynode);
            compiled = null;
          } catch (err) {}
        }

        if (!soyFileAlreadyEmitted) {
          stream.emit('data', file);
          soyFileAlreadyEmitted = true;
        }

        if (compiled) {
          stream.emit('data', compiled);
        }
      });
    });

    stream.emit('end');
    cb();
  });
}

/**
 * Calls the given arg if it's a function. Otherwise, just returns it as it is.
 * @param {*} arg
 * @param {!Object} file File object to pass to called function.
 * @return {*}
 */
function callFunctionArg(arg, file) {
  return (typeof arg === 'function') ? arg(file) : arg;
}

/**
 * Returns the file paths of the given files.
 * @param {array} files Buffered files array.
 * @return {array}
 */
function getFilePaths(files) {
  return files.map(function(file) {
    return path.relative(file.cwd, file.path);
  });
}

/**
 * This method allows templates to be rendered by SoyWeb. It deliberately
 * includes dummy data so the designer can get a feel for how the task list
 * will appear with real data rather with minimal copy and paste. For more
 * information visit: http://plovr.com/soyweb.html
 * @param {File} file The soy template file.
 * @param {object} optionsInternal
 * @param {object} optionsSoynode
 * @return {File} Returns a file containing the rendered SoyWeb content.
 */
function renderSoyWeb(file, optionsInternal, optionsSoynode) {
  var namespace = lookupNamespace(file.contents.toString());

  var rendered = soynode.render(
    namespace + '.soyweb',
    callFunctionArg(optionsInternal.renderSoyWebContext, file),
    callFunctionArg(optionsInternal.renderSoyWebInjectedData, file),
    optionsSoynode.locales ? optionsSoynode.locales[0] : null
  );
  var renderedFile = new gutil.File({
    base: file.base,
    contents: new Buffer(rendered),
    cwd: file.cwd,
    path: gutil.replaceExtension(file.path, optionsInternal.renderSoyWebFileExtension)
  });
  return renderedFile;
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

module.exports = gulpSoynode;
