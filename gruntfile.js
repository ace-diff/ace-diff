module.exports = function(grunt) {
  "use strict";

  grunt.loadNpmTasks("grunt-contrib-clean");
  grunt.loadNpmTasks("grunt-contrib-watch");
  grunt.loadNpmTasks("grunt-contrib-uglify");


  var config = {
    watch: {
      scripts: {
        files: "d3pie-source/*.js",
        tasks: ["min"]
      }
    },

    uglify: {
      d3pie: {
        files: {
          "d3pie/d3pie.min.js": "d3pie/d3pie.js"
        },
        options: {
          banner: "/*!\n" +
          "* d3pie\n" +
          "* @author Ben Keen\n" +
          "* @version " + packageFile.version + "\n" +
          "* @date June 2014\n" +
          "* @repo http://github.com/benkeen/d3pie\n" +
          "*/\n"
        }
      }
    }
  };

  grunt.initConfig(config);
  grunt.registerTask("generate", _generate);

};
