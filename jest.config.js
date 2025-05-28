module.exports = {
  testEnvironment: "jsdom",
  transform: {
    "^.+\\.js$": "babel-jest",
  },
  moduleFileExtensions: ["js"],
  setupFilesAfterEnv: ["@testing-library/jest-dom"],
};
