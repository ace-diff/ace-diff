module.exports = function(grunt) {
  "use strict";

  grunt.loadNpmTasks("grunt-contrib-clean");
  grunt.loadNpmTasks("grunt-contrib-watch");
  grunt.loadNpmTasks("grunt-contrib-uglify");

  var packageFile = grunt.file.readJSON("package.json");

  var config = {
    watch: {
      scripts: {
        files: "dist/*.js",
        tasks: ["uglify:lib"]
      }
    },

    uglify: {
      lib: {
        files: {
          "dist/ace-diff.min.js": "dist/ace-diff.js"
        },
        options: {
          banner: "/*!\n" +
          "* ace-diff\n" +
          "* @author Ben Keen\n" +
          "* @version " + packageFile.version + "\n" +
          "* @date Mar 1st, 2015\n" +
          "* @repo http://github.com/benkeen/ace-diff\n" +
          "*/\n"
        }
      }
    }
  };

  grunt.initConfig(config);
};
