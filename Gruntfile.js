/* eslint func-names: 0 */

const autoprefixer = require('autoprefixer');

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

    postcss: {
      options: {
        map: {
          prev: 'dist/', // save all sourcemaps as separate files...
          annotation: 'dist/' // ...to the specified directory
        },

        processors: [
          autoprefixer({ browsers: 'last 2 versions' }) // add vendor prefixes
        ]
      },
      dist: {
        src: 'dist/multihandle.css',
        dest: 'dist/multihandle.css'
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

  grunt.loadNpmTasks('grunt-babel');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-eslint');
  grunt.loadNpmTasks('grunt-postcss');
  grunt.loadNpmTasks('grunt-sass');

  grunt.registerTask('dev', ['eslint', 'babel', 'copy', 'sass', 'postcss']);
  grunt.registerTask('continuous', ['dev', 'watch']);
  grunt.registerTask('default', ['dev']);
};
