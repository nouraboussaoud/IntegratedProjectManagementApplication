module.exports = {
    transform: {
      "^.+\\.js$": "babel-jest"
    },
    collectCoverage: true,
    coverageReporters: ['lcov', 'text', 'text-summary'],
    coverageDirectory: 'coverage',
    collectCoverageFrom: [
      'controllers/**/*.js',
      'models/**/*.js',
      'routes/**/*.js',
      'services/**/*.js',
      'Utils/**/*.js',
      '!**/node_modules/**',
      '!**/test/**',
      '!**/__mocks__/**'
    ]
  };
  
