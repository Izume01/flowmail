export type LogLevel = 'INFO' | 'ERROR' | 'WARN' | 'DEBUG';

export class Logger {
  info(message: string, data?: any) {
    this.log('INFO', message, data);
  }

  error(message: string, data?: any) {
    this.log('ERROR', message, data);
  }

  warn(message: string, data?: any) {
    this.log('WARN', message, data);
  }

  debug(message: string, data?: any) {
    this.log('DEBUG', message, data);
  }

  private log(level: LogLevel, message: string, data?: any) {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      message,
      data: data || {}
    }));
  }
}

export const log = new Logger();
