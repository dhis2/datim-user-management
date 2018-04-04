'use strict';
var gulp = require('gulp');
var runSequence = require('run-sequence');
var del = require('del');
var path = require('path');

var dhisDirectory;
var buildDirectory = 'build';

var files = [
    //Vendor dependency files
    'vendor/jquery/dist/jquery.js',
    'vendor/toastr/toastr.js',
    'vendor/angular/angular.js',
    'vendor/angular-animate/angular-animate.js',
    'vendor/ui-router/release/angular-ui-router.js',
    'vendor/lodash/dist/lodash.js',
    'vendor/restangular/dist/restangular.js',
    'vendor/angular-ui-select/dist/select.js',
    'vendor/angular-bootstrap/ui-bootstrap-tpls.js',
    'vendor/angular-messages/angular-messages.js',
    'vendor/angular-ui-utils/validate.js',
    'vendor/file-saver/FileSaver.js',

    //Test specific includes
    'test/fixtures/fixtures.js',
    'test/utils/*.js',
    'test/matchers/*.js',
    'vendor/angular-mocks/angular-mocks.js',

    //Source files
    'src/ngBootstrapper.js',
    'src/**/*.js',
    'src/**/*.html',

    //Testmocks
    'test/mocks/*_mock.js',

    //Jasmine spec files
    'test/specs/**/*_spec.js'
];

/**************************************************************************************************
 * Utility functions
 */

function runKarma(watch) {
    var karma = require('gulp-karma');
    var config = {
        configFile: 'test/karma.conf.js'
    };

    if (!watch) {
        watch = false;
    }

    if (watch === true) {
        config.action = 'watch';
    }

    return karma(config);
}

function printHelp() {
    var task;
    var taskDescriptions = {
        default: 'Display this help',
        test: 'Run the unit tests once',
        watch: 'Run the unit tests on change detection',
        jshint: 'Run jshint on the sourcecode',
        jscs: 'Run jscs on the sourcecode',
        sass: 'Run sass on the sass files and save the output to temp directory',
        i18n: 'Copy the language files to the build directory',
        manifest: 'Copy the manifest to the build directory',
        images: 'Copy the images to the build directory',
        package: 'Package the build directory in a zip file',
        min: 'Minify and concat the html and javascript files'
    };

    console.log('\nGulp has the following available tasks.');
    for (task in gulp.tasks) {
        if (gulp.tasks.hasOwnProperty(task)) {
            console.log('  ' + gulp.tasks[task].name + (taskDescriptions[task] ? ' -- ' + taskDescriptions[task] : ''));
        }
    }
    console.log('');
}

/**
 * Checks if the dhis.json file is present in the root of the project. This will be required for
 * tasks that interact with a running dhis2 instance (for example to circumvent the install process)
 */
function checkForDHIS2ConfigFile() {
    var dhisConfig = require(path.resolve('./dhis.json'));

    if (!dhisConfig.dhisDeployDirectory) {
        console.log('');
        console.log('Dhis 2 deploy directory not set, please add a dhis.json to your project that looks like');
        console.log(JSON.stringify({ dhisDeployDirectory: '<YOUR DHIS2 DIRECTORY>' }, undefined, 2));
        console.log('');
        throw new Error('DHIS deploy location not found');
    }
    dhisDirectory = dhisConfig.dhisDeployDirectory;

    return dhisConfig;
}

function stringSrc(filename, string) {
    var src = require('stream').Readable({ objectMode: true })
    src._read = function () {
        this.push(new gutil.File({ cwd: "", base: "", path: filename, contents: new Buffer(string) }))
        this.push(null)
    }
    return src
}

/**************************************************************************************************
 * Gulp tasks
 */
gulp.task('default', function () {
    printHelp();
});

gulp.task('test', function () {
    return gulp.src(files).pipe(runKarma());
});

gulp.task('watch', function () {
    return gulp.src(files).pipe(runKarma(true));
});

gulp.task('jshint', function () {
    var jshint = require('gulp-jshint');
    return gulp.src([
            'test/specs/**/*.js',
            'src/**/*.js'
        ])
        .pipe(jshint())
        .pipe(jshint.reporter('jshint-stylish'))
        .pipe(jshint.reporter('fail'));
});

gulp.task('jscs', function () {
    var jscs = require('gulp-jscs');
    return gulp.src([
        'test/specs/**/*.js',
        'src/**/*.js'
    ]).pipe(jscs('./.jscsrc'));
});

gulp.task('sass', function () {
    var sass = require('gulp-ruby-sass');

    return gulp.src('src/app/app.sass', { base: './src/' })
        .pipe(sass())
        .pipe(gulp.dest(
            ['temp', 'css'].join('/')
        ));
});

gulp.task('i18n', function () {
    return gulp.src('src/i18n/**/*.json', { base: './src/' }).pipe(gulp.dest(
        buildDirectory
    ));
});

gulp.task('manifest', function () {
    return gulp.src('src/**/*.webapp', { base: './src/' }).pipe(gulp.dest(
        buildDirectory
    ));
});

gulp.task('images', function () {
    return gulp.src('src/**/icons/**/*', { base: './src/' }).pipe(gulp.dest(
        buildDirectory
    ));
});

gulp.task('package', function () {
    var zip = require('gulp-zip');
    return gulp.src('build/**/*', { base: './build/' })
        .pipe(zip('user-management.zip', { compress: false }))
        .pipe(gulp.dest('.'));
});

gulp.task('min', ['sass'], function () {
    var mangleJS = false;

    var useref = require('gulp-useref');
    var gulpif = require('gulp-if');
    var ngAnnotate = require('gulp-ng-annotate');
    var uglify = require('gulp-uglify');
    var minifyCss = require('gulp-minify-css');
    var rev = require('gulp-rev');
    var replaceRev = require('gulp-rev-replace');
    var webpack = require('gulp-webpack');

    var assets = useref.assets();

    return gulp.src('src/**/*.html')
        .pipe(assets)
        .pipe(assets.restore())
        .pipe(useref())
        .pipe(gulpif('*.css', minifyCss()))
        .pipe(gulpif('**/app.js', ngAnnotate({
            add: true,
            remove: true,
            single_quotes: true,
            stats: true
        })))
        .pipe(webpack())
        .pipe(gulpif('!**/index.html', rev()))
        .pipe(replaceRev())
        .pipe(gulp.dest(buildDirectory));
});

gulp.task('copy-files', function () {
    return gulp.src(['vendor/bootstrap/dist/fonts/*'])
        .pipe(gulp.dest(buildDirectory + '/fonts'));
});

gulp.task('copy-fonts', function () {
    return gulp.src(['vendor/font-awesome/fonts/**/*.*'], {base: './vendor/font-awesome/'})
        .pipe(gulp.dest(buildDirectory));
});

gulp.task('copy-jquery', function () {
    return gulp.src(['vendor/jquery/dist/jquery.min.js'])
        .pipe(gulp.dest(buildDirectory));
});

var rev = require('gulp-rev');
var pckg = require('./package');

gulp.task('build-html', function () {
    var htmlReplace = require('gulp-html-replace');
    var gulp = require('gulp');
    var webpack = require('webpack-stream');

    return gulp.src('src/**/*.html')
        .pipe(htmlReplace({
            js: `user-maintenance-${pckg.version}.js`,
            css: `css/user-maintenance-${pckg.version}.css`,
        }))
        .pipe(gulp.dest(buildDirectory));
});

gulp.task('build-webpack', ['build-html'], function () {
    var webpack = require('gulp-webpack');

    return gulp.src('src/index.js')
        .pipe(webpack(require('./webpack.config.prod.js')))
        .pipe(gulp.dest(buildDirectory));

});

gulp.task('replace-rev', ['build-webpack', 'build-html', 'build-css'], function () {
    var replaceRev = require('gulp-rev-replace');

    return gulp.src(`${buildDirectory}/user-maintenance-${pckg.version}.js`)
        .pipe(replaceRev({manifest: rev.manifest()}))
        .pipe(gulp.dest(buildDirectory));
});

gulp.task('build-css', function () {
    var minifyCss = require('gulp-minify-css');
    var rename = require('gulp-rename');

    return gulp.src('src/css/app.css', { base: './src/' })
        .pipe(minifyCss())
        .pipe(rename(`css/user-maintenance-${pckg.version}.css`))
        .pipe(gulp.dest('build'));
});

gulp.task('build', function (cb) {
    runSequence('clean', 'i18n', 'manifest', 'images', 'build-html', 'build-css', 'build-webpack', 'copy-files', 'copy-fonts', 'copy-jquery', cb);
});

gulp.task('build-prod', function (cb) {
    runSequence('build', 'package', cb);
});

gulp.task('clean', function (cb) {
    del(buildDirectory, cb);
});

gulp.task('modify-manifest', function (cb) {
    var fs = require('fs');
    var dhisConfig = checkForDHIS2ConfigFile();

    fs.readFile('build/manifest.webapp', 'utf8', function (err, data) {
        var manifest;

        if (err) {
            throw new Error('Failed to load manifest from build directory');
        }

        manifest = JSON.parse(data);
        if (!(manifest && manifest.activities && manifest.activities.dhis && manifest.activities.dhis.href)) {
            throw new Error('Incorrect manifest "manifest.activities.dhis.href" is not available');
        }
        manifest.activities.dhis.href = dhisConfig.dhisBaseUrl || '*';

        fs.writeFile('build/manifest.webapp', JSON.stringify(manifest, undefined, 2), function (err) {
            if (err) {
                throw new Error('Failed to save modified manifest');
            }
            cb();
        });
    });
});

gulp.task('copy-app', function () {
    checkForDHIS2ConfigFile();
    return gulp.src('build/**/*.*', { base: './build/' })
        .pipe(gulp.dest(dhisDirectory));
});

gulp.task('copy-to-dev', function () {
    return runSequence('clean', 'i18n', 'manifest', 'images', 'jshint', 'jscs', 'min', 'copy-files', 'copy-fonts', 'copy-jquery', 'modify-manifest', 'copy-app');
});

gulp.task('travis', function () {
    return runSequence('test', 'jshint', 'jscs');
});
