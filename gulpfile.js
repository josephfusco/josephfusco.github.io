import gulp from 'gulp';
import autoprefixer from 'gulp-autoprefixer';
import rename from 'gulp-rename';
import gulpSass from 'gulp-sass';
import * as sass from 'sass';

const sassCompiler = gulpSass(sass);

// Compile SASS
export function styles() {
  return gulp.src('./assets/sass/**/*.scss')
    .pipe(sassCompiler().on('error', sassCompiler.logError))
    .pipe(sassCompiler({outputStyle: 'compressed'}))
    .pipe(autoprefixer())
    .pipe(rename({ suffix: '.min' }))
    .pipe(gulp.dest('./assets/css/'));
}

// Watch task
export function watchFiles() {
  gulp.watch('./assets/sass/**/*.scss', styles);
  gulp.watch('./assets/js/*.js', () => { console.log('JS file changed') });
}

// Default task
export default gulp.series(styles, watchFiles);
