// Mock implementation of pino
module.exports = function() {
  return {
    info: () => {},
    error: () => {},
    warn: () => {},
    debug: () => {},
    trace: () => {},
    fatal: () => {},
    child: () => module.exports()
  };
}; 