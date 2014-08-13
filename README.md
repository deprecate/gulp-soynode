# [gulp-soynode](http://gulpjs.com) [![Build Status](https://travis-ci.org/eduardolundgren/gulp-soynode.svg?branch=master)](https://travis-ci.org/eduardolundgren/gulp-soynode)

> Gulp plugin using [soynode](https://github.com/Medium/soynode) for working with Closure Templates, aka Soy.

*Issues with the output should be reported on the soynode [issue tracker](https://github.com/Medium/soynode/issues).*

## Install

```bash
$ npm install --save-dev gulp-soynode
```

## Usage

```js
var gulp = require('gulp');
var soynode = require('gulp-soynode');

gulp.task('build', function() {
  gulp.src('views/*.soy')
    .pipe(soynode())
    .pipe(gulp.dest('build'));
});
```

You can also watch for changes to rebuild all templates:

```js
gulp.task('watch', function() {
  gulp.watch('views/*.soy', ['build']);
});
```

Or, if you prefer, rebuild only one the modified file:

```js
gulp.task('watch', function() {
  gulp.watch('test/*.soy', function(file) {
    gulp.src(file.path)
      .pipe(soynode())
      .pipe(gulp.dest('build'));
  });
});
```

## Message extraction
You can also use `gulp-soynode` to extract all messages from your soy templates into a tlf file, which can be used for [translating](https://developers.google.com/closure/templates/docs/translation) them later. To use it, just call `soynode.lang` with the name of the file you want the messages to be extracted to:

```js
var gulp = require('gulp');
var soynode = require('gulp-soynode');

gulp.task('build-lang', function() {
  gulp.src('views/*.soy')
    .pipe(soynode.lang({
      outputFile: 'translations/translations/*.soy'
    }));
});
```

## API

### soynode(options)

Options can be set via `soynode(options)`, the keys can contain the following:

- `renderSoyWeb` {boolean} Whether SoyWeb templates will be rendered automatically. It deliberately allows to includes dummy data so the designer can get a feel for how the task list will appear with real data rather with minimal copy and paste. For more information visit [http://plovr.com/soyweb.html](http://plovr.com/soyweb.html). [Default: false]
- `renderSoyWebContext` {object} Default render context of rendered SoyWeb file. [Default: null]
- `renderSoyWebFileExtension` {string} File extension of the rendered SoyWeb file. Relevant when your Soy template outputs other formats, like `.md`. [Default: .html]
- `inputDir` {string} Optional path to a directory where files will be read. When compiled from a directory, this option will be overwritten with the caller inputDir. [Default: process.cwd()]
- `outputDir` {string} Path to a directory where files will be written. [Default: null]
- `eraseTemporaryFiles` {boolean} Whether to erase temporary files after a compilation. [Default: false]
- `concatOutput` {boolean} Whether the compiled soy.js files should be joined into a single file. This is helpful for loading templates in a browser and simplest to use when `outputDir` is explicitly set and `uniqueDir` is false. [Default: false]
- `concatFileName` {string} File name used for concatenated files, only relevant when concatOutput is true, ".soy.concat.js" is appended, so don't include ".js" yourself. [Default: compiled]

See the soynode [options](https://github.com/Medium/soynode) for more information.

### soynode.lang(options)

Options can be set via `soynode.lang(options)`, the keys can contain the following:

- `outputFile` {String} The path of the file with the resulting extracted messages. [Default: '/tmp/soynode/translations.xlf']

Contributing
------------

Questions, comments, bug reports, and pull requests are all welcome. Submit them at
[the project on GitHub](https://github.com/eduardolundgren/gulp-soynode/issues).

Bug reports that include steps-to-reproduce (including code) are the best. Even better, make them in
the form of pull requests.

## License

[MIT](http://opensource.org/licenses/MIT) © [Eduardo Lundgren](http://eduardo.io)

Author
------

[Eduardo Lundgren](https://github.com/eduardolundgren)
([personal website](http://eduardo.io)).
