// =============================================
//  logger.js — Colored console logger
// =============================================

const C = {
  reset:   '\x1b[0m',
  bold:    '\x1b[1m',
  dim:     '\x1b[2m',
  red:     '\x1b[31m',
  green:   '\x1b[32m',
  yellow:  '\x1b[33m',
  blue:    '\x1b[34m',
  magenta: '\x1b[35m',
  cyan:    '\x1b[36m',
  white:   '\x1b[37m',
};

function ts() {
  return new Date().toLocaleTimeString('id-ID', { hour12: false });
}

function tag(label, color) {
  return `${C.dim}${ts()}${C.reset} ${color}${C.bold}[${label}]${C.reset}`;
}

export const logger = {
  info:  (msg, ...a) => console.log(`${tag('INFO',  C.green)}   ${msg}`, ...a),
  warn:  (msg, ...a) => console.log(`${tag('WARN',  C.yellow)}   ${msg}`, ...a),
  error: (msg, ...a) => console.log(`${tag('ERROR', C.red)}  ${msg}`, ...a),
  music: (msg, ...a) => console.log(`${tag('MUSIC', C.magenta)} ${msg}`, ...a),
  debug: (msg, ...a) => {
    if (process.env.DEBUG === 'true') {
      console.log(`${tag('DEBUG', C.cyan)}  ${msg}`, ...a);
    }
  },
};

export default logger;
