const { log } = require('console');
const util = require('util');

const LOG_LEVEL = {
    INFO: 'INFO',
    WARNING: 'WARNING',
    ERROR: 'ERROR',
};

const TERMINAL_COLOR = {
    RED: '\x1b[31m',
    YELLOW: '\x1b[33m',
    DEFAULT: '\x1b[0m',
}

function getLineOfCode() {
    const err = new Error();
    let backslash = '/';
    if (process.platform === 'win32') {
        backslash = '\\';
    }
    
    const parentFunction = err.stack.split('\n')[2];
    const fileAndLineOfCode = parentFunction
        .split(backslash)
        .reverse()[0]
        .split(')')[0];
    return fileAndLineOfCode;
}

function printToConsole(logLevel, ...message){
    const dateInUtc = new Date().toISOString();
    const args = util.format(...message);
    let maybeColor = '';
    if (logLevel === LOG_LEVEL.ERROR) {
        maybeColor = TERMINAL_COLOR.RED;
    } else if (logLevel === LOG_LEVEL.WARNING) {
        maybeColor = TERMINAL_COLOR.YELLOW;
    }
    const formattedMessage = `${maybeColor}${dateInUtc} ${logLevel}:${getLineOfCode()} ${args} ${TERMINAL_COLOR.DEFAULT}`
    console.log(formattedMessage);
}

function info(...message) {
    printToConsole(LOG_LEVEL.INFO, ...message)
}

function warn(...message) {
    printToConsole(LOG_LEVEL.WARNING, ...message)
}

function error(...message) {
    printToConsole(LOG_LEVEL.ERROR, ...message)
}

module.exports = { info, warn, error };