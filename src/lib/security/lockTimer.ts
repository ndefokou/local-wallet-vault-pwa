/**
 * Lock timer for automatic vault locking after inactivity
 */

export type LockTimerCallback = () => void;

export class LockTimer {
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private timeoutMs: number;
  private callback: LockTimerCallback | null = null;
  private lastActivity: number = Date.now();

  constructor(timeoutSeconds: number = 300) {
    this.timeoutMs = timeoutSeconds * 1000;
  }

  /**
   * Set the callback to be called when the timer expires
   */
  setCallback(callback: LockTimerCallback): void {
    this.callback = callback;
  }

  /**
   * Update the timeout duration
   */
  setTimeout(timeoutSeconds: number): void {
    this.timeoutMs = timeoutSeconds * 1000;
    this.reset();
  }

  /**
   * Start the lock timer
   */
  start(): void {
    this.stop();
    this.lastActivity = Date.now();
    
    this.timeoutId = setTimeout(() => {
      if (this.callback) {
        this.callback();
      }
    }, this.timeoutMs);
  }

  /**
   * Stop the lock timer
   */
  stop(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  /**
   * Reset the timer (call on user activity)
   */
  reset(): void {
    this.lastActivity = Date.now();
    this.stop();
    this.start();
  }

  /**
   * Get remaining time in seconds
   */
  getRemainingSeconds(): number {
    const elapsed = Date.now() - this.lastActivity;
    const remaining = Math.max(0, this.timeoutMs - elapsed);
    return Math.ceil(remaining / 1000);
  }

  /**
   * Check if timer is running
   */
  isRunning(): boolean {
    return this.timeoutId !== null;
  }

  /**
   * Get the configured timeout in seconds
   */
  getTimeoutSeconds(): number {
    return this.timeoutMs / 1000;
  }
}

/**
 * Activity tracker for lock timer
 */
export class ActivityTracker {
  private lockTimer: LockTimer;
  private boundHandlers: {
    visibilityChange: () => void;
    mouseMove: () => void;
    keyPress: () => void;
    touchStart: () => void;
  };

  constructor(lockTimer: LockTimer) {
    this.lockTimer = lockTimer;
    
    this.boundHandlers = {
      visibilityChange: this.handleVisibilityChange.bind(this),
      mouseMove: this.handleActivity.bind(this),
      keyPress: this.handleActivity.bind(this),
      touchStart: this.handleActivity.bind(this),
    };
  }

  /**
   * Start tracking user activity
   */
  start(): void {
    document.addEventListener('visibilitychange', this.boundHandlers.visibilityChange);
    document.addEventListener('mousemove', this.boundHandlers.mouseMove);
    document.addEventListener('keypress', this.boundHandlers.keyPress);
    document.addEventListener('touchstart', this.boundHandlers.touchStart);
  }

  /**
   * Stop tracking user activity
   */
  stop(): void {
    document.removeEventListener('visibilitychange', this.boundHandlers.visibilityChange);
    document.removeEventListener('mousemove', this.boundHandlers.mouseMove);
    document.removeEventListener('keypress', this.boundHandlers.keyPress);
    document.removeEventListener('touchstart', this.boundHandlers.touchStart);
  }

  /**
   * Handle visibility change (tab switching)
   */
  private handleVisibilityChange(): void {
    if (document.hidden) {
      // Tab is hidden, could start a shorter timer or just note the time
      // For now, we'll just let the normal timer continue
    } else {
      // Tab is visible again, reset the timer
      this.lockTimer.reset();
    }
  }

  /**
   * Handle user activity
   */
  private handleActivity(): void {
    this.lockTimer.reset();
  }
}