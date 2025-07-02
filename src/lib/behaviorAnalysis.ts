export class BehaviorAnalysis {
  private mouseMovements: Array<{ x: number; y: number; timestamp: number }> = [];
  private keystrokes: Array<{ key: string; timestamp: number }> = [];
  private scrollEvents: Array<{ deltaY: number; timestamp: number }> = [];
  private focusEvents: Array<{ type: 'focus' | 'blur'; timestamp: number }> = [];
  private startTime: number = 0;
  private isTracking: boolean = false;
  private eventListeners: Array<() => void> = [];

  startTracking(): void {
    if (this.isTracking) return;
    
    this.isTracking = true;
    this.startTime = Date.now();
    this.mouseMovements = [];
    this.keystrokes = [];
    this.scrollEvents = [];
    this.focusEvents = [];

    // Mouse movement tracking
    const mouseHandler = (e: MouseEvent) => {
      this.mouseMovements.push({
        x: e.clientX,
        y: e.clientY,
        timestamp: Date.now()
      });
      
      // Keep only last 100 movements
      if (this.mouseMovements.length > 100) {
        this.mouseMovements.shift();
      }
    };

    // Keyboard tracking
    const keyHandler = (e: KeyboardEvent) => {
      this.keystrokes.push({
        key: e.key,
        timestamp: Date.now()
      });
      
      // Keep only last 50 keystrokes
      if (this.keystrokes.length > 50) {
        this.keystrokes.shift();
      }
    };

    // Scroll tracking
    const scrollHandler = (e: WheelEvent) => {
      this.scrollEvents.push({
        deltaY: e.deltaY,
        timestamp: Date.now()
      });
      
      // Keep only last 50 scroll events
      if (this.scrollEvents.length > 50) {
        this.scrollEvents.shift();
      }
    };

    // Focus tracking
    const focusHandler = () => {
      this.focusEvents.push({
        type: 'focus',
        timestamp: Date.now()
      });
    };

    const blurHandler = () => {
      this.focusEvents.push({
        type: 'blur',
        timestamp: Date.now()
      });
    };

    // Add event listeners
    document.addEventListener('mousemove', mouseHandler, { passive: true });
    document.addEventListener('keydown', keyHandler, { passive: true });
    document.addEventListener('wheel', scrollHandler, { passive: true });
    window.addEventListener('focus', focusHandler);
    window.addEventListener('blur', blurHandler);

    // Store cleanup functions
    this.eventListeners.push(
      () => document.removeEventListener('mousemove', mouseHandler),
      () => document.removeEventListener('keydown', keyHandler),
      () => document.removeEventListener('wheel', scrollHandler),
      () => window.removeEventListener('focus', focusHandler),
      () => window.removeEventListener('blur', blurHandler)
    );
  }

  stopTracking(): void {
    if (!this.isTracking) return;
    
    this.isTracking = false;
    this.eventListeners.forEach(cleanup => cleanup());
    this.eventListeners = [];
  }

  analyzeBehavior() {
    const now = Date.now();
    const sessionDuration = now - this.startTime;

    return {
      sessionDuration,
      mouseActivity: this.analyzeMouseActivity(),
      keyboardActivity: this.analyzeKeyboardActivity(),
      scrollActivity: this.analyzeScrollActivity(),
      focusActivity: this.analyzeFocusActivity(),
      overallSuspicionScore: this.calculateSuspicionScore(),
      isHumanLike: this.isHumanLikeBehavior()
    };
  }

  private analyzeMouseActivity() {
    if (this.mouseMovements.length < 2) {
      return {
        totalMovements: 0,
        averageSpeed: 0,
        smoothnessScore: 0,
        patternScore: 0
      };
    }

    let totalDistance = 0;
    let totalTime = 0;
    const speeds: number[] = [];
    const directions: number[] = [];

    for (let i = 1; i < this.mouseMovements.length; i++) {
      const prev = this.mouseMovements[i - 1];
      const curr = this.mouseMovements[i];
      
      const distance = Math.sqrt(
        Math.pow(curr.x - prev.x, 2) + Math.pow(curr.y - prev.y, 2)
      );
      const timeDiff = curr.timestamp - prev.timestamp;
      
      if (timeDiff > 0) {
        const speed = distance / timeDiff;
        speeds.push(speed);
        totalDistance += distance;
        totalTime += timeDiff;
        
        // Calculate direction change
        if (i > 1) {
          const prevPrev = this.mouseMovements[i - 2];
          const angle1 = Math.atan2(prev.y - prevPrev.y, prev.x - prevPrev.x);
          const angle2 = Math.atan2(curr.y - prev.y, curr.x - prev.x);
          directions.push(Math.abs(angle2 - angle1));
        }
      }
    }

    const averageSpeed = totalTime > 0 ? totalDistance / totalTime : 0;
    const speedVariance = this.calculateVariance(speeds);
    const smoothnessScore = this.calculateSmoothness(directions);
    const patternScore = this.detectPatterns(this.mouseMovements);

    return {
      totalMovements: this.mouseMovements.length,
      averageSpeed,
      speedVariance,
      smoothnessScore,
      patternScore
    };
  }

  private analyzeKeyboardActivity() {
    if (this.keystrokes.length < 2) {
      return {
        totalKeystrokes: 0,
        averageInterval: 0,
        rhythmScore: 0
      };
    }

    const intervals: number[] = [];
    for (let i = 1; i < this.keystrokes.length; i++) {
      intervals.push(this.keystrokes[i].timestamp - this.keystrokes[i - 1].timestamp);
    }

    const averageInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    const rhythmScore = this.calculateRhythmScore(intervals);

    return {
      totalKeystrokes: this.keystrokes.length,
      averageInterval,
      rhythmScore
    };
  }

  private analyzeScrollActivity() {
    return {
      totalScrolls: this.scrollEvents.length,
      averageScrollDelta: this.scrollEvents.length > 0 
        ? this.scrollEvents.reduce((sum, event) => sum + Math.abs(event.deltaY), 0) / this.scrollEvents.length
        : 0
    };
  }

  private analyzeFocusActivity() {
    return {
      totalFocusEvents: this.focusEvents.length,
      focusChanges: this.focusEvents.filter(event => event.type === 'focus').length
    };
  }

  private calculateSuspicionScore(): number {
    let score = 0;

    // Check mouse activity
    const mouseActivity = this.analyzeMouseActivity();
    if (mouseActivity.totalMovements === 0) score += 30;
    if (mouseActivity.patternScore > 0.8) score += 20; // Too regular patterns
    if (mouseActivity.averageSpeed > 2 || mouseActivity.averageSpeed < 0.1) score += 15;

    // Check keyboard activity
    const keyboardActivity = this.analyzeKeyboardActivity();
    if (keyboardActivity.rhythmScore > 0.9) score += 20; // Too regular typing
    if (keyboardActivity.averageInterval < 50) score += 15; // Too fast typing

    // Check overall interaction
    const sessionDuration = Date.now() - this.startTime;
    if (sessionDuration > 5000 && mouseActivity.totalMovements < 5) score += 25;

    return Math.min(100, score);
  }

  private isHumanLikeBehavior(): boolean {
    const suspicionScore = this.calculateSuspicionScore();
    return suspicionScore < 50;
  }

  private calculateVariance(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    const mean = numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
    const variance = numbers.reduce((sum, num) => sum + Math.pow(num - mean, 2), 0) / numbers.length;
    return variance;
  }

  private calculateSmoothness(directions: number[]): number {
    if (directions.length === 0) return 0;
    const averageDirectionChange = directions.reduce((sum, dir) => sum + dir, 0) / directions.length;
    return Math.max(0, 1 - (averageDirectionChange / Math.PI));
  }

  private detectPatterns(movements: Array<{ x: number; y: number; timestamp: number }>): number {
    if (movements.length < 10) return 0;

    // Simple pattern detection - check for repetitive movements
    let patternScore = 0;
    const windowSize = 5;
    
    for (let i = 0; i < movements.length - windowSize * 2; i++) {
      const pattern1 = movements.slice(i, i + windowSize);
      const pattern2 = movements.slice(i + windowSize, i + windowSize * 2);
      
      let similarity = 0;
      for (let j = 0; j < windowSize; j++) {
        const dist = Math.sqrt(
          Math.pow(pattern1[j].x - pattern2[j].x, 2) + 
          Math.pow(pattern1[j].y - pattern2[j].y, 2)
        );
        if (dist < 10) similarity++;
      }
      
      patternScore = Math.max(patternScore, similarity / windowSize);
    }

    return patternScore;
  }

  private calculateRhythmScore(intervals: number[]): number {
    if (intervals.length === 0) return 0;
    
    const variance = this.calculateVariance(intervals);
    const mean = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    
    // Lower variance relative to mean indicates more regular rhythm
    return mean > 0 ? Math.max(0, 1 - (Math.sqrt(variance) / mean)) : 0;
  }
}