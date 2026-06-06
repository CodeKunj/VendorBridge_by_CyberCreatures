const env = require('./env');

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const currentLevel = levels[env.logLevel] ?? levels.info;

const write = (level, message, meta) => {
  if (levels[level] > currentLevel) {
    return;
  }

  const entry = {
    level,
    timestamp: new Date().toISOString(),
    message,
  };

  if (meta !== undefined) {
    entry.meta = meta;
  }

  const line = JSON.stringify(entry);

  if (level === 'error') {
    console.error(line);
    return;
  }

  if (level === 'warn') {
    console.warn(line);
    return;
  }

  console.log(line);
};

module.exports = {
  error: (message, meta) => write('error', message, meta),
  warn: (message, meta) => write('warn', message, meta),
  info: (message, meta) => write('info', message, meta),
  debug: (message, meta) => write('debug', message, meta),
};