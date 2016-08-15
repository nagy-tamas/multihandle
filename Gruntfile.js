/* eslint func-names: 0 */
module.exports = function (grunt) {
  grunt.initConfig({
    babel: {
      options: {
        sourceMap: true
      },
      dist: {
        files: {
          'dist/multihandle.js': 'src/multihandle.js'
        }
      }
    },

    sass: {
      options: {
        sourceMap: true
      },
      dist: {
        files: {
          'dist/multihandle.css': 'src/sass/multihandle.scss'
        }
      }
    },

    copy: {
      dist: {
        files: {
          'dist/polyfill.js': 'src/polyfill.js'
        }
      }
    },

    eslint: {
      files: ['Gruntfile.js', 'src/multihandle.js']
    },

    watch: {
      options: {
        spawn: false
      },
      files: ['src/**/*'],
      tasks: ['dev']
    }
  });

  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-eslint');
  grunt.loadNpmTasks('grunt-babel');
  grunt.loadNpmTasks('grunt-sass');

  grunt.registerTask('dev', ['eslint', 'babel', 'copy', 'sass']);
  grunt.registerTask('continuous', ['dev', 'watch']);
  grunt.registerTask('default', ['dev']);
};
