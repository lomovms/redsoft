import gulp from 'gulp';
import gulpLoadPlugins from 'gulp-load-plugins';
import browserSync from 'browser-sync';
import del from 'del';
import {stream as wiredep} from 'wiredep';

const $ = gulpLoadPlugins();
const reload = browserSync.reload;

var globSass = require('gulp-sass-glob-import');
var spritesmith = require('gulp.spritesmith');
var autoprefixer = require('gulp-autoprefixer');
var sassLint = require('gulp-sass-lint');
var eol = require('gulp-eol');
var htmlreplace = require('gulp-html-replace');
var twig = require('gulp-twig');
var data = require('gulp-data');
var path = require('path');
var fs = require('fs');

var svgSprite = require('gulp-svg-sprite'),
    svgmin = require('gulp-svgmin'),
    cheerio = require('gulp-cheerio'),
    replace = require('gulp-replace');

var gcmq = require('gulp-group-css-media-queries');

var srcFolder = 'app/';
var distFolder = 'dist/';


// add to name of styles current timeDate for anti-cache
gulp.task('styles_version', ['twig-copy', 'sprite-svg'], function() {
  gulp.src(distFolder + '{,*/}*.twig')
    .pipe(htmlreplace({
      'styles_version': 'template_styles.min.css?v' + getDateTime()
    }))
    .pipe(gulp.dest(distFolder));
});


// Compile css from scss (only after sprite has generated)
gulp.task('styles', ['sprite-svg'], () => {
  return gulp.src(srcFolder + 'scss/template_styles.scss')
    .pipe($.plumber())
    //.pipe($.sourcemaps.init())
    .pipe(globSass())
    .pipe($.sass({
      outputStyle: 'expanded',
      precision: 10,
      includePaths: ['.']
    }).on('error', $.sass.logError))
    .pipe(autoprefixer({ browsers: ["> 0%", 'last 2 versions', 'Firefox ESR'] }))
    //.pipe($.sourcemaps.write())
    .pipe($.rename('template_styles.css'))
    .pipe(gulp.dest(distFolder))
    .pipe(gulp.dest('.tmp'))
    .pipe(reload({stream: true}));
});

// Minify css
gulp.task('cssmin', ['styles'], () => {
  return gulp.src([distFolder + 'template_styles.css', '!' + distFolder + '*.min.css'])
    .pipe($.cssmin())
    .pipe($.rename({suffix: '.min'}))
    .pipe(gulp.dest(distFolder));
});

gulp.task('scripts', () => {
  return gulp.src(srcFolder + 'js/**/*.js')
    .pipe($.plumber())
    .pipe($.babel())
    .pipe(gulp.dest('.tmp/js'))
    .pipe(reload({stream: true}));
});

// compile twig to html for browsing
gulp.task('twig-compile', function () {
  gulp.src(srcFolder + 'twig/{,*/}*.twig')
    .pipe(eol())
    .pipe(data(function(file, cb) {
      return getJsonAsync(srcFolder + 'json-data/' + path.basename(file.path, '.twig') + '.json', cb);
    }))
    .pipe(twig())
    .pipe(gulp.dest('.tmp'));

    // demonstrate HTML
    setTimeout(function(){
    return gulp.src('.tmp/*.html')
      .pipe(eol())
      .pipe($.useref({searchPath: ['.tmp', srcFolder, '.']}))
      .pipe(gulp.dest(distFolder));
    }, 500);
});

// copy twig to destination folder
gulp.task('twig-copy', ['cssmin'], function () {
  gulp.src(srcFolder + 'twig/{,*/}*.twig')
    .pipe(eol())
    .pipe(gulp.dest('.tmp/twig'))
    .pipe($.useref({searchPath: ['.tmp/twig', srcFolder, '.']}))
    .pipe(gulp.dest(distFolder));
});


// Optimize images
gulp.task('images', function () {
  return gulp.src([srcFolder + 'images/**/*', '!' + srcFolder + 'images/required/sprite.png'])
    .pipe($.cache($.imagemin({
      progressive: true,
      interlaced: true,
      // don't remove IDs from SVGs, they are often used
      // as hooks for embedding and styling
      svgoPlugins: [{cleanupIDs: false}]
    })))
    .pipe(gulp.dest(distFolder + 'images'));
});

// Make sprite with icons
/*
gulp.task('sprite-png', function () {
  var spriteData =
    gulp.src(srcFolder + 'images/icons-png/*.png') // путь, откуда берем картинки для спрайта
      .pipe(spritesmith({
          imgName: 'sprite.png',
          imgPath: '#{$img-path}sprite.png?v' + getDateTime(),
          cssFormat: 'scss',
          cssName: 'sprite-png.scss',
          algorithm: 'binary-tree',
          padding: 2,
          engineOpts: {imagemagick: true},
          algorithmOpts: {sort: false},
          cssTemplate: srcFolder + 'sprite-templates/png_sprite-template.handlebars'
      }));
      spriteData.img.pipe(gulp.dest(srcFolder + 'images/required/')); // путь, куда сохраняем картинку
      spriteData.css.pipe(gulp.dest(srcFolder + 'scss/')); // путь, куда сохраняем стили
  return gulp.src(srcFolder + 'images/required/sprite.png')
    .pipe(gulp.dest(distFolder + 'images/required/'));
});
*/

gulp.task('sprite-svg', function () {
  return gulp.src(srcFolder + 'images/icons-svg/*.svg')
  // minify svg
    .pipe(svgmin({
      js2svg: {
        pretty: true
      }
    }))
    // remove all fill and style declarations in out shapes
    .pipe(cheerio({
      run: function ($) {
        $('title').remove();
        $('[fill]').removeAttr('fill');
        $('[stroke]').removeAttr('stroke');
        $('[style]').removeAttr('style');
      },
      parserOptions: {xmlMode: true}
    }))
    // cheerio plugin create unnecessary string '&gt;', so replace it.
    .pipe(replace('&gt;', '>'))
    // build svg sprite
    .pipe(svgSprite({
      mode: {
        symbol: {
          sprite: '../images/required/sprite.svg',
          render: {
            scss: {
              dest:'../scss/sprite-svg.scss',
              template: srcFolder + 'sprite-templates/svg_sprite-template.handlebars'
            }
          },
          example: false
        }
      }
    }))
    .pipe(gulp.dest(srcFolder));
});

gulp.task('fonts', () => {
  return gulp.src(require('main-bower-files')('**/*.{eot,svg,ttf,woff,woff2}', function (err) {})
    .concat(srcFolder + 'fonts/**/*'))
    .pipe(gulp.dest('.tmp/fonts'))
    .pipe(gulp.dest(distFolder + 'fonts'));
});

gulp.task('extras', () => {
  return gulp.src([
    srcFolder + '*.*'
  ], {
    dot: true
  }).pipe(gulp.dest(distFolder));
});

gulp.task('backResponces', () => {
  return gulp.src([
    srcFolder + 'responses/*.*',
  ], {
    dot: true
  })
  .pipe(gulp.dest('.tmp/responses'))
  .pipe(gulp.dest(distFolder + 'responses'));
});
/*
gulp.task('templates', () => {
  return gulp.src([
    srcFolder + 'angular-templates/*.*',
  ], {
    dot: true
  })
  .pipe(gulp.dest('.tmp/angular-templates'))
  .pipe(gulp.dest(distFolder + 'angular-templates'));
});
*/
gulp.task('clean', del.bind(null, ['.tmp', distFolder], function (done) {
  return $.cache.clearAll(done);
}));

gulp.task('serve', ['styles', 'scripts', 'fonts', 'twig-compile', 'backResponces'], () => {

  browserSync({
    notify: false,
    port: 9010,
    server: {
      baseDir: ['.tmp', srcFolder],
      routes: {
        '/bower_components': 'bower_components'
      }
    }
  });

  gulp.watch([
    '.tmp/*.html',
    srcFolder + 'js/**/*.js',
    '.tmp/fonts/**/*',
    srcFolder + 'images/required/*',
    srcFolder + 'images/example/*',
    //srcFolder + 'images/icons/*.png',
    '.tmp/fonts/**/*',
    '.tmp/angular-templates/*'
  ]).on('change', reload);

  gulp.watch(srcFolder + 'twig/{,*/}*.twig', ['twig-compile']);
  gulp.watch(srcFolder + 'json-data/*.json', ['twig-compile']);

  // sass-lint before make CSS
  gulp.watch(
    [srcFolder + 'scss/{,*/}*.scss', '!' + srcFolder + 'scss/sprite-svg.scss', '!' + srcFolder + 'scss/bootstrap/**/*.scss'],
    {debounceDelay: 200},
    function (ev) {
      if (ev.type === 'added' || ev.type === 'changed') {
        gulp.src(ev.path)
          .pipe(sassLint({
            configFile: srcFolder + 'config/sass-lint.yml'
          }))
          .pipe(sassLint.format());
      }
    }
  )

  //gulp.watch(srcFolder+'images/icons/*.png', ['sprite-png']); // regenerate PNG sprite
  gulp.watch(srcFolder+'images/icons-svg/*.svg', ['sprite-svg']); // regenerate SVG sprite
  gulp.watch([srcFolder + 'scss/{,*/}*.scss', '!' + srcFolder + 'scss/sprite-svg.scss'], ['styles']);
  gulp.watch(srcFolder + 'js/{,*/}*.js', ['scripts']);
  gulp.watch(srcFolder + 'images/required/*', ['images']);
  gulp.watch(srcFolder + 'images/example/*', ['images']);
  gulp.watch(srcFolder + 'fonts/{,*/}*', ['fonts']);
  gulp.watch(srcFolder+'responses/**/*', ['backResponces']);
});

// inject bower components
gulp.task('wiredep', () => {
  gulp.src(srcFolder + 'scss/*.scss')
    .pipe(wiredep({
      ignorePath: /^(\.\.\/)+/
    }))
    .pipe(gulp.dest(srcFolder + 'scss'));

  gulp.src(srcFolder + '*.html')
    .pipe(wiredep({
      ignorePath: /^(\.\.\/)*\.\./
    }))
    .pipe(gulp.dest(srcFolder));
});

gulp.task('build', ['styles_version', 'images', 'fonts', 'extras', 'backResponces', 'twig-compile'], () => {
  // uglify all js (only after all tasks finished)
  gulp.src([distFolder+'js/*.js', '!'+distFolder+'js/*.min.js'])
    .pipe($.uglify().on('error', function(e){
      console.log(e);
    }))
    .pipe($.rename({suffix: '.min'}))
    .pipe(gulp.dest(distFolder+'js'));
  return gulp.src(distFolder + '**/*').pipe($.size({title: 'build', gzip: true}));
});

gulp.task('default', ['clean'], () => {
  gulp.start('build');
});

// Оптимизация media-queries
gulp.task('mqpack', () => {
  return gulp.src([distFolder + '*.css', '!' + distFolder + '*.min.css'])
    .pipe(gcmq()) // оптимизируем
    .pipe(gulp.dest(distFolder)) // кидаем в папку
    .pipe($.cssmin()) // минифицируем
    .pipe($.rename({suffix: '.min'})) // переименовываем
    .pipe(gulp.dest(distFolder)); // кидаем в папку
});

function getDateTime() {
  var now     = new Date();
  var year    = now.getFullYear();
  var month   = now.getMonth() + 1;
  var day     = now.getDate();
  var hour    = now.getHours();
  var minute  = now.getMinutes();
  var second  = now.getSeconds();
  if(month.toString().length == 1) {
      var month = '0' + month;
  }
  if(day.toString().length == 1) {
      var day = '0' + day;
  }
  if(hour.toString().length == 1) {
      var hour = '0' + hour;
  }
  if(minute.toString().length == 1) {
      var minute = '0' + minute;
  }
  if(second.toString().length == 1) {
      var second = '0'+second;
  }
  var dateTime = year + month + day + hour + minute + second;
  return dateTime;
}

var getJsonAsync = function (p, cb) {
    fs.stat(p, function (err) {
        if (err) {
            cb(undefined, {});
        } else {
            fs.readFile(p, 'utf8', function (errRead, data) {
                if (errRead) {
                    cb(undefined, {});
                } else {
                    var jsData = JSON.parse(data);
                    cb(undefined, jsData);
                }
            })
        }
    })
};
