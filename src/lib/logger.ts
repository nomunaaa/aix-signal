/**
 * Development-only logger utility
 * All console.log statements should use this instead of direct console.log
 * In production builds, these logs will be stripped out automatically
 */

const isDevelopment = process.env.NODE_ENV !== "production";

export const logger = {
  /**
   * Debug-level logging (only in development)
   * @param args - Any number of arguments to log
   */
   
  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.warn('[DEBUG]', ...args);
    }
  },

  /**
   * Info-level logging (only in development)
   * @param args - Any number of arguments to log
   */
   
  info: (...args: any[]) => {
    if (isDevelopment) {
      console.warn('[INFO]', ...args);
    }
  },

  /**
   * Warning logs (shown in both dev and production)
   * @param args - Any number of arguments to log
   */
   
  warn: (...args: any[]) => {
    console.warn('[WARN]', ...args);
  },

  /**
   * Error logs (shown in both dev and production)
   * @param args - Any number of arguments to log
   */
   
  error: (...args: any[]) => {
    console.error('[ERROR]', ...args);
  },

  /**
   * Table logging (only in development)
   * @param data - Data to display in table format
   */
   
  table: (data: any) => {
    if (isDevelopment) {
       
      console.table(data);
    }
  },

  /**
   * Group logging (only in development)
   * @param label - Group label
   */
  group: (label: string) => {
    if (isDevelopment) {
       
      console.group(label);
    }
  },

  /**
   * End group logging (only in development)
   */
  groupEnd: () => {
    if (isDevelopment) {
       
      console.groupEnd();
    }
  },
};

export default logger;

