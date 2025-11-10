import morgan from 'morgan';
import type { Request, Response } from 'express';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m',
};

const colorize = {
  method: (method: string) => {
    const methodColors: Record<string, string> = {
      GET: colors.cyan,
      POST: colors.green,
      PUT: colors.yellow,
      PATCH: colors.magenta,
      DELETE: colors.red,
      OPTIONS: colors.dim,
      HEAD: colors.dim,
    };
    const color = methodColors[method] || colors.white;
    return `${color}${method}${colors.reset}`;
  },
  status: (status: string | number) => {
    const statusCode = parseInt(String(status), 10);
    let color;
    if (statusCode >= 500) color = colors.red;
    else if (statusCode >= 400) color = colors.yellow;
    else if (statusCode >= 300) color = colors.cyan;
    else if (statusCode >= 200) color = colors.green;
    else color = colors.white;
    return `${color}${status}${colors.reset}`;
  },
  url: (url: string) => `${colors.blue}${url}${colors.reset}`,
  time: (time: string) => {
    const ms = parseFloat(time);
    let color = colors.green;
    if (ms > 1000) color = colors.red;
    else if (ms > 500) color = colors.yellow;
    return `${color}${time}ms${colors.reset}`;
  },
  ip: (ip: string) => `${colors.dim}${ip}${colors.reset}`,
  date: (date: string) => `${colors.dim}${date}${colors.reset}`,
};

morgan.token('colored-method', (req: Request) => colorize.method(req.method || '-'));
morgan.token('colored-status', (_req: Request, res: Response) => {
  const status = res.statusCode || '-';
  return colorize.status(status);
});
morgan.token('colored-url', (req: Request) => colorize.url(req.originalUrl || req.url));
morgan.token('colored-ip', (req: Request) => {
  const ip = req.ip || req.socket?.remoteAddress || '-';
  return colorize.ip(ip);
});
morgan.token('colored-date', () => {
  const date = new Date().toISOString();
  return colorize.date(date);
});

const format = ':colored-date | :colored-ip | :colored-method :colored-url | :colored-status | :response-time';

const coloredStream = {
  write: (message: string) => {
    const coloredMessage = message.replace(/(\d+\.?\d*ms)/g, (match) => {
      const ms = parseFloat(match);
      let color = colors.green;
      if (ms > 1000) color = colors.red;
      else if (ms > 500) color = colors.yellow;
      return `${color}${match}${colors.reset}`;
    });
    console.log(coloredMessage.trim());
  }
};

export const coloredLogger = morgan(format, {
  skip: () => false,
  stream: coloredStream,
});

