const gulp = require('gulp');
const concat = require('gulp-concat'); // 需要安装包
const through = require("through2")
const del = require('del');
const gulpif = require('gulp-if');
const exec = require('child_process').exec;
const uglify = require('gulp-uglify');
const ts = require("gulp-typescript"); //ts转js
const tsProject = ts.createProject("tsconfig.json", {
    declaration: true
});

var outPath = "dest";
var FlatUtils = {
    tsc: function() {
        return gulp.src(tsProject.config.include)
                    .pipe(gulpif(function(file) {
                        return file.basename !== 'FlatJ.ts';
                    }, tsProject()))
                    .pipe(gulp.dest(outPath))
    },

    combineDts: function() {
        return gulp.src(outPath+'/**/*.d.ts')
                    .pipe(concat("flatJ.d.ts"))
                    .pipe(gulp.dest(outPath))
                    .pipe(through.obj(function(file, _, cb) {
                        let str = file.contents.toString();
                        str = str.replace(/declare/g, '');
                        str = `declare module FlatJ {\n` + str + `\n}`;
                        file.contents = Buffer.from(str);
                        this.push(file);
                        cb();
                    }))
                    .pipe(gulp.dest(outPath));
    },
   
    clearDest: function() {
        return del([outPath]);
    }, 

    clearOtherFiles: function() {
        return del(
            [
                `${outPath}/core`,
                `${outPath}/ui`,
                `${outPath}/**/*.ts`,
                `${outPath}/**/*.js`,
                `${outPath}/**/*d.ts`,
                `!${outPath}/flatJ.d.ts`
            ]);
    },

    clearBuild: function() {
        return del(["c:/work/code/myself/FlatJ/build/web-mobile"]);
    },

    cocosBuild: function() {
        return exec("C:/soft/CocosDashboard/resources/.editors/Creator/2.4.9/CocosCreator.exe --path c:/work/code/myself/FlatJ --build 'configPath=c:/work/code/myself/FlatJ/webPub.json'")
    },

    moveBuildJs: function() {
        return gulp.src('./build/web-mobile/assets/main/index.*.js')
                    .pipe(concat('flatJ.dist.js'))
                    .pipe(uglify({mangle:{toplevel:true}}))
                    .pipe(gulp.dest(outPath));
    },
}

module.exports = {
    clearDest: FlatUtils.clearDest,
    tsc: FlatUtils.tsc,
    combineDts: FlatUtils.combineDts,
    clearOtherFiles: FlatUtils.clearOtherFiles,
    cocosBuild: FlatUtils.cocosBuild,
    moveBuildJs: FlatUtils.moveBuildJs,
    clearBuild: FlatUtils.clearBuild,
}
