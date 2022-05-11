const { series, parallel, src, dest, watch } = require('gulp')

const del = require('del')

const loadPlugins = require('gulp-load-plugins')

const plugins = loadPlugins()

const sass = require('gulp-sass')(require('sass'))
// const plugins.babel = require('gulp-babel');
// const plugins.swig = require('gulp-swig');
// const plugins.imagemin = require('gulp-imagemin');

const browserSync = require('browser-sync')
const bs = browserSync.create()

const cwd = process.cwd()
let config = {
  // default config
  build: {
    src: 'src',
    dest: 'dist',
    temp: '.temp',
    public: 'public',
    paths: {
      styles: 'assets/styles/*.scss',
      scripts: 'assets/scripts/*.js',
      pages: '*.html',
      images: 'assets/images/**',
      fonts: 'assets/fonts/**'
    }
  }
}

try {
  const loadConfig = require(`${cwd}/pages.config.js`)
  config = Object.assign({}, config, loadConfig)
} catch (e) {}

const clean = () => {
  return del([config.build.dest, config.build.temp])
}

const styles = (a) => {
  return src(config.build.paths.styles, {
    base: config.build.src,
    cwd: config.build.src
  })
    .pipe(sass.sync())
    .pipe(dest(config.build.temp))
    .pipe(bs.reload({ stream: true }))
}

const scripts = () => {
  return src(config.build.paths.scripts, {
    base: config.build.src,
    cwd: config.build.src
  })
    .pipe(plugins.babel({ presets: [require('@babel/preset-env')] }))
    .pipe(dest(config.build.temp))
    .pipe(bs.reload({ stream: true }))
}

const pages = () => {
  return src(config.build.paths.pages, {
    base: config.build.src,
    cwd: config.build.src
  })
    .pipe(
      plugins.swig({
        data: config.data,
        defaults: { cache: false }
      })
    )
    .pipe(dest(config.build.temp))
    .pipe(bs.reload({ stream: true }))
}

const images = () => {
  return src(config.build.paths.images, {
    base: config.build.src,
    cwd: config.build.src
  })
    .pipe(plugins.imagemin())
    .pipe(dest(config.build.dest))
}

const fonts = () => {
  return src(config.build.paths.fonts, {
    base: config.build.src,
    cwd: config.build.src
  })
    .pipe(plugins.imagemin())
    .pipe(dest(config.build.dest))
}

const extra = () => {
  return src('**', {
    base: config.build.public,
    cwd: config.build.public
  }).pipe(dest(config.build.dest))
}

const serve = () => {
  watch(config.build.paths.styles, { cwd: config.build.src }, styles)
  watch(config.build.paths.scripts, { cwd: config.build.src }, scripts)
  watch(config.build.paths.pages, { cwd: config.build.src }, pages)
  // watch('src/assets/images/**', images);
  // watch('src/assets/fonts/**', fonts);
  // watch('public/**', extra);

  watch(
    [config.build.paths.images, config.build.paths.fonts],
    { cwd: config.build.src },
    bs.reload
  )
  watch('**', { cwd: config.build.public }, bs.reload)

  bs.init({
    notify: false,
    port: 8081,
    // files: 'temp/**',
    open: false,
    server: {
      baseDir: [config.build.temp, config.build.src, config.build.public],
      routes: {
        '/node_modules': 'node_modules'
      }
    }
  })
}

const useref = () => {
  return src(config.build.paths.pages, {
    base: config.build.temp,
    cwd: config.build.temp
  })
    .pipe(plugins.useref({ searchPath: ['temp', '.'] }))
    .pipe(plugins.if(/\.js$/, plugins.uglify()))
    .pipe(plugins.if(/\.css$/, plugins.cleanCss()))
    .pipe(
      plugins.if(
        /\.html$/,
        plugins.htmlmin({
          collapseWhitespace: true,
          minifyJS: true,
          minifyCSS: true,
          removeComments: true
        })
      )
    )
    .pipe(dest(config.build.dest))
}

const compile = parallel(styles, scripts, pages)

const build = series(
  clean,
  parallel(series(compile, useref), images, fonts, extra)
)

const develop = series(clean, compile, serve)

module.exports = {
  clean,
  build,
  develop
}
