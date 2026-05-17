export type LogLevel = 'INFO' | 'ERROR' | 'WARN' | 'DEBUG';

export class Logger {
  info(message: string, data?: Record<string, unknown>) {
    this.log('INFO', message, data);
  }

  error(message: string, data?: Record<string, unknown>) {
    this.log('ERROR', message, data);
  }

  warn(message: string, data?: Record<string, unknown>) {
    this.log('WARN', message, data);
  }

  debug(message: string, data?: Record<string, unknown>) {
    this.log('DEBUG', message, data);
  }

  private log(level: LogLevel, message: string, data?: Record<string, unknown>) {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      message,
      data: data || {}
    }));
  }
}

export const log = new Logger();
