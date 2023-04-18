var gulp = require("gulp");
const flatJUtils = require("./utils/flatJUtils");

gulp.task('clearDest', function() {
    return flatJUtils.clearDest();
 });

gulp.task('tsc', function() {
   return flatJUtils.tsc();
});

gulp.task('combineDts', function() {
   return flatJUtils.combineDts();
});

gulp.task('clearOtherFiles', function() {
   return flatJUtils.clearOtherFiles();
});

gulp.task('clearBuild', function() {
   return flatJUtils.clearBuild();
});

gulp.task('cocosBuild', function() {
   return flatJUtils.cocosBuild();
});

gulp.task('moveBuildJs', function() {
   return flatJUtils.moveBuildJs();
});

gulp.task('pub', gulp.series('clearDest', 'tsc', 'combineDts', 'clearOtherFiles', 'clearBuild', 'cocosBuild','moveBuildJs', function(cb){
   return cb();
}));
