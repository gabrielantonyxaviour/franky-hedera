const noop = () => {}

const pinoStub = function() {
  return {
    trace: noop,
    debug: noop,
    info: noop,
    warn: noop,
    error: noop,
    fatal: noop
  }
}

pinoStub.levels = {
  values: {
    trace: 10,
    debug: 20,
    info: 30,
    warn: 40,
    error: 50,
    fatal: 60
  }
}

module.exports = pinoStub 