require('babel-register');

// Mock Ace for now
global.ace = {
  require() { return { Range: true }; },
};
