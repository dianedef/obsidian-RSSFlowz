declare namespace NodeJS {
  interface Timeout {
    _destroyed?: boolean;
    _idleTimeout: number;
    _idlePrev?: Timeout;
    _idleNext?: Timeout;
    _idleStart: number;
    _onTimeout: () => void;
    _timerArgs?: unknown[];
    _repeat: number | null;
  }
} 