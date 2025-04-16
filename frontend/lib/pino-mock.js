// Mock implementation of pino for browser environments
// This prevents issues with pino which is not browser compatible but may be required by WalletConnect

const noop = () => {}

const noopLogger = {
  trace: noop,
  debug: noop,
  info: noop,
  warn: noop,
  error: noop,
  fatal: noop,
  silent: noop,
  child: () => noopLogger
}

function pino() {
  return noopLogger
}

// Add all the exports that pino might have
pino.destination = () => ({ write: noop })
pino.transport = () => null
pino.multistream = () => null
pino.final = () => noopLogger
pino.stdSerializers = {}
pino.stdTimeFunctions = {}
pino.symbols = {}
pino.version = '0.0.0'
pino.levels = {
  values: {
    trace: 10,
    debug: 20,
    info: 30,
    warn: 40,
    error: 50,
    fatal: 60
  },
  labels: {
    10: 'trace',
    20: 'debug',
    30: 'info',
    40: 'warn',
    50: 'error',
    60: 'fatal'
  }
}

// Export the mock
module.exports = pino 