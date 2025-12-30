# Performance Profiling Dashboard

## Overview

The Performance Profiling Dashboard provides real-time analysis of state transition performance, helping identify bottlenecks and optimize application behavior.

## Features

✅ **Real-Time Metrics** - Live performance data as you use the application  
✅ **Transition Analysis** - Detailed metrics for each state transition  
✅ **Slow Transition Detection** - Automatically identifies slow operations  
✅ **Context Size Tracking** - Monitors memory usage  
✅ **Visual Dashboard** - Easy-to-read performance visualization  

## Accessing the Dashboard

The Performance Dashboard is automatically available in the debug view:

1. Enable debug logging (`Azure DevOps Integration: Toggle Debug View`)
2. Open the work items view
3. The Performance Dashboard appears below the History Timeline

## Dashboard Components

### Summary Metrics

- **Total Transitions** - Number of state transitions recorded
- **Average Transition Time** - Mean duration of all transitions
- **Total Duration** - Cumulative time for all transitions
- **Average Context Size** - Mean size of context objects

### Slow Transitions

Automatically highlights transitions that exceed the threshold (default: 100ms):
- Shows transition path (from → to)
- Displays duration
- Shows event count
- Shows context size
- Includes label if available

### All Transitions

Complete list of all transitions with:
- State transition path
- Duration (highlighted if slow)
- Event count
- Context size
- Labels

## Usage

### Setting Threshold

Adjust the threshold slider to filter slow transitions:
- Lower threshold = more sensitive (shows more transitions)
- Higher threshold = less sensitive (shows only very slow transitions)

### Filtering Slow Transitions

Toggle "Show slow only" to focus on performance issues:
- Shows only transitions exceeding threshold
- Helps identify bottlenecks quickly

## Programmatic Access

### Get Performance Profile

```typescript
import { PerformanceProfiler } from './debugging/performanceProfiler.js';

const profile = PerformanceProfiler.profileHistory();

console.log('Average transition time:', profile.summary.averageTransitionTime);
console.log('Slowest transitions:', profile.summary.slowestTransitions);
```

### Get Slow Transitions

```typescript
// Get transitions slower than 100ms
const slow = PerformanceProfiler.getSlowTransitions(100);

// Get transitions slower than 500ms
const verySlow = PerformanceProfiler.getSlowTransitions(500);
```

### Get Transitions by State

```typescript
// Get all transitions involving 'active' state
const activeTransitions = PerformanceProfiler.getTransitionsByState('active');
```

### Get Average Transition Time

```typescript
// Get average time for specific transition
const avgTime = PerformanceProfiler.getAverageTransitionTime('inactive', 'active');
```

### Format Profile

```typescript
const profile = PerformanceProfiler.profileHistory();
const formatted = PerformanceProfiler.formatProfile(profile);
console.log(formatted);
```

### Export Profile

```typescript
const json = PerformanceProfiler.exportProfile();
// Save to file or send to analytics
```

## Performance Metrics

### Transition Duration

Time between state transitions, measured in milliseconds:
- **Fast**: < 50ms
- **Normal**: 50-100ms
- **Slow**: 100-500ms
- **Very Slow**: > 500ms

### Context Size

Size of context object in bytes:
- **Small**: < 10KB
- **Medium**: 10-100KB
- **Large**: 100KB-1MB
- **Very Large**: > 1MB

### Event Count

Number of events processed in a transition:
- More events = potentially slower transition
- Helps identify complex operations

## Best Practices

1. **Monitor Regularly** - Check dashboard during development
2. **Set Appropriate Threshold** - Adjust based on your performance goals
3. **Investigate Slow Transitions** - Focus optimization efforts on slowest operations
4. **Track Context Size** - Large contexts may indicate memory issues
5. **Compare Over Time** - Use exported profiles to track performance trends

## Use Cases

### 1. Identify Performance Bottlenecks

```typescript
const slow = PerformanceProfiler.getSlowTransitions(200);
console.log('Slow transitions:', slow.map(t => `${t.from} → ${t.to}: ${t.duration}ms`));
```

### 2. Optimize State Transitions

```typescript
// Before optimization
const before = PerformanceProfiler.profileHistory();

// ... make optimizations ...

// After optimization
const after = PerformanceProfiler.profileHistory();

console.log('Improvement:', before.summary.averageTransitionTime - after.summary.averageTransitionTime, 'ms');
```

### 3. Monitor Memory Usage

```typescript
const profile = PerformanceProfiler.profileHistory();
const largeContexts = profile.transitions.filter(t => t.contextSize > 100 * 1024);

console.log('Large contexts:', largeContexts.length);
```

### 4. Performance Regression Detection

```typescript
// In CI/CD
const profile = PerformanceProfiler.profileHistory();
const slowCount = profile.summary.slowestTransitions.filter(t => t.duration > 500).length;

if (slowCount > 5) {
  throw new Error('Performance regression detected');
}
```

## Integration with Testing

### Performance Tests

```typescript
it('should complete activation quickly', () => {
  resetEngine();
  
  dispatch([ActivateEvent.create({})]);
  dispatch([ActivationCompleteEvent.create({})]);
  
  const profile = PerformanceProfiler.profileHistory();
  const activationTime = profile.transitions.find(
    t => t.from === 'inactive' && t.to === 'activating'
  )?.duration || 0;
  
  expect(activationTime).toBeLessThan(100); // Should be fast
});
```

## See Also

- [History Timeline](./PRAXIS_HISTORY_ENGINE_TESTING_DEBUGGING_PLAN.md#21-time-travel-debugging-ui)
- [Build Integration](./BUILD_INTEGRATION.md)
- [Testing Examples](./PRAXIS_HISTORY_EXAMPLES_GUIDE.md)

