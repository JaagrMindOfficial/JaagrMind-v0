/**
 * Production-aware logger utility
 * Logs are shown in development but hidden in production
 */

const isProduction = process.env.NODE_ENV === 'production';

const logger = {
    log: (...args) => {
        if (!isProduction) {
            console.log(...args);
        }
    },
    info: (...args) => {
        if (!isProduction) {
            console.info('[INFO]', ...args);
        }
    },
    warn: (...args) => {
        // Warnings are always shown
        console.warn('[WARN]', ...args);
    },
    error: (...args) => {
        // Errors are always shown
        console.error('[ERROR]', ...args);
    },
    debug: (...args) => {
        if (!isProduction) {
            console.debug('[DEBUG]', ...args);
        }
    }
};

module.exports = logger;
