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

// Create the levels object that will be both a named export and attached to the default export
const levels = {
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

// Create the main pino function
const pino = () => noopLogger

// Add all the standard pino properties
Object.assign(pino, {
  destination: () => ({ write: noop }),
  transport: () => null,
  multistream: () => null,
  final: () => noopLogger,
  stdSerializers: {},
  stdTimeFunctions: {},
  symbols: {},
  version: '0.0.0',
  levels
})

// Named exports
export { levels }

// Default export
export default pino 