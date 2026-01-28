import winston from 'winston';

const { combine, timestamp, printf, colorize, errors } = winston.format;

/**
 * Custom log format
 */
const logFormat = printf(({ level, message, timestamp, stack, ...metadata }) => {
  let log = `${timestamp} [${level}]: ${message}`;

  if (Object.keys(metadata).length > 0) {
    log += ` ${JSON.stringify(metadata)}`;
  }

  if (stack) {
    log += `\n${stack}`;
  }

  return log;
});

/**
 * Winston logger instance
 */
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    logFormat
  ),
  transports: [
    new winston.transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        logFormat
      ),
    }),
  ],
});

/**
 * Log an info message
 * @param {string} message - Log message
 * @param {object} [metadata] - Additional metadata
 */
export function info(message, metadata = {}) {
  logger.info(message, metadata);
}

/**
 * Log an error message
 * @param {string} message - Log message
 * @param {Error|object} [errorOrMetadata] - Error object or metadata
 */
export function error(message, errorOrMetadata = {}) {
  if (errorOrMetadata instanceof Error) {
    logger.error(message, { stack: errorOrMetadata.stack, error: errorOrMetadata.message });
  } else {
    logger.error(message, errorOrMetadata);
  }
}

/**
 * Log a warning message
 * @param {string} message - Log message
 * @param {object} [metadata] - Additional metadata
 */
export function warn(message, metadata = {}) {
  logger.warn(message, metadata);
}

/**
 * Log a debug message
 * @param {string} message - Log message
 * @param {object} [metadata] - Additional metadata
 */
export function debug(message, metadata = {}) {
  logger.debug(message, metadata);
}

export default { info, error, warn, debug };
