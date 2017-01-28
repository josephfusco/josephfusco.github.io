const gulp = require('gulp')
const sass = require('gulp-sass')
const rename = require('gulp-rename')
const watch = require('gulp-watch')
const autoprefixer = require('gulp-autoprefixer')

gulp.task('styles', () => {
	gulp.src('./assets/sass/**/*.scss')
		.pipe(sass().on('error', sass.logError))
		.pipe(sass({outputStyle: 'compressed'}))
		.pipe(autoprefixer())
		.pipe(rename({suffix: '.min'}))
		.pipe(gulp.dest('./assets/css/'))
});

gulp.task('watch', () => {
	gulp.watch('./assets/sass/**/*.scss', ['styles'])
	gulp.watch('./assets/js/*.js', ['js'])
});

gulp.task('default', ['styles', 'watch'])
