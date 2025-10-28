# 🧠 Intelligent Statistical Architecture Discipline

## Overview

This system uses **statistical analysis** and **adaptive thresholds** to maintain code quality without arbitrary limits. It grows with your project and provides intelligent recommendations based on actual patterns in your codebase.

## 🎯 Core Principles

### 1. **Statistical Thresholds, Not Arbitrary Limits**
- **File sizes** are compared against similar file types in your project
- **Function complexity** is measured against project averages
- **Purity scores** are calculated based on side effects and complexity
- **Outliers** are detected using statistical methods (95th percentile, 2 standard deviations)

### 2. **File Type Classification**
Files are automatically classified into categories with appropriate expectations:

| Type | Expected Size Range | Complexity Threshold | Purpose |
|------|-------------------|---------------------|---------|
| **Machine** | 50-200 lines | 8 | FSM state machines |
| **Client** | 100-400 lines | 12 | API clients, services |
| **Handler** | 80-300 lines | 10 | Event handlers, controllers |
| **Utility** | 30-150 lines | 6 | Pure functions, helpers |
| **Integration** | 60-250 lines | 9 | Bridges, adapters |
| **Test** | 20-200 lines | 5 | Test files |
| **Config** | 20-100 lines | 4 | Configuration files |

### 3. **Function Purity Scoring (0-100)**
Functions are scored based on:
- **Side effects** (logging, state mutation, I/O)
- **Parameter count** (fewer is better)
- **Cyclomatic complexity** (simpler is better)
- **Pure function indicators** (return values, no external dependencies)

## 🚀 Development Methodology

### **Natural Prevention Strategies**

#### **1. Start Small, Stay Focused**
```typescript
// ✅ Good: Small, focused function
function calculateElapsedTime(startTime: number): number {
  return Date.now() - startTime;
}

// ❌ Avoid: Large, multi-purpose function
function handleUserAction(action: string, data: any, context: any): any {
  // 200+ lines of mixed concerns
}
```

#### **2. Extract Early, Extract Often**
```typescript
// ✅ Good: Extract when function grows beyond ~30 lines
function processWorkItem(item: WorkItem): ProcessedItem {
  const validated = validateWorkItem(item);
  const enriched = enrichWithMetadata(validated);
  const transformed = transformForDisplay(enriched);
  return transformed;
}

// ❌ Avoid: Let functions grow large
function processWorkItem(item: WorkItem): ProcessedItem {
  // 100+ lines of validation, enrichment, transformation
}
```

#### **3. Single Responsibility Principle**
```typescript
// ✅ Good: One concern per file
// src/timer/validation.ts - Timer validation only
// src/timer/persistence.ts - Timer persistence only
// src/timer/ui-integration.ts - Timer UI only

// ❌ Avoid: Multiple concerns in one file
// src/timer.ts - Everything timer-related
```

#### **4. Composition Over Monoliths**
```typescript
// ✅ Good: Compose small modules
import { validateTimer } from './validation';
import { saveTimerState } from './persistence';
import { updateTimerUI } from './ui-integration';

function startTimer(timerData: TimerData): void {
  const validated = validateTimer(timerData);
  saveTimerState(validated);
  updateTimerUI(validated);
}

// ❌ Avoid: Large monolithic functions
function startTimer(timerData: TimerData): void {
  // 200+ lines of validation, persistence, UI updates
}
```

### **Statistical Enforcement**

#### **1. Pre-commit Checks**
```bash
# Automatically runs before every commit
npm run check:architecture
```

#### **2. CI/CD Pipeline**
```yaml
# Runs on every PR and push
- name: Architecture Analysis
  run: npm run check:architecture
```

#### **3. Development Workflow**
```bash
# Check current state
npm run check:architecture

# Get detailed analysis
npm run check:architecture:detailed

# Fix issues before committing
npm run lint:fix
```

## 📊 Understanding the Analysis

### **Project Health Score (0-100)**
- **90-100**: Excellent architecture, maintainable code
- **70-89**: Good architecture, minor improvements needed
- **50-69**: Fair architecture, some refactoring recommended
- **Below 50**: Poor architecture, significant refactoring required

### **Outlier Detection**
Files are flagged as outliers if they:
- Exceed the **95th percentile** for their file type
- Are **2 standard deviations** above the mean
- Have **complexity** above 1.5x the threshold
- Have **purity scores** below 50

### **Recommendation Priorities**
- **🔴 High Priority**: Critical outliers requiring immediate attention
- **🟡 Medium Priority**: Significant improvements recommended
- **🟢 Low Priority**: Minor optimizations suggested

## 🔧 Refactoring Strategies

### **For Large Files (>95th percentile)**
1. **Extract by Responsibility**: Split into focused modules
2. **Extract by Feature**: Create feature-based directories
3. **Extract Utilities**: Move pure functions to utility modules
4. **Extract Integration**: Separate external API interactions

### **For Complex Functions (>threshold)**
1. **Extract Conditions**: Move complex conditions to named functions
2. **Extract Loops**: Move loop logic to separate functions
3. **Use Early Returns**: Reduce nesting levels
4. **Apply Strategy Pattern**: Replace large switch statements

### **For Low Purity Scores (<60)**
1. **Separate Side Effects**: Extract I/O operations
2. **Pure Data Transformations**: Isolate pure logic
3. **Dependency Injection**: Reduce hard-coded dependencies
4. **Functional Composition**: Use function composition patterns

## 📈 Monitoring and Trends

### **Key Metrics to Watch**
- **File Size Growth**: Track average file size over time
- **Complexity Trend**: Monitor cyclomatic complexity
- **Purity Trend**: Track function purity scores
- **Outlier Count**: Number of files exceeding thresholds

### **Healthy Project Indicators**
- **Stable file sizes** within expected ranges
- **Decreasing complexity** over time
- **Increasing purity** scores
- **Few outliers** (<5% of files)

## 🎯 Success Criteria

### **Immediate Goals**
- [ ] All critical outliers addressed
- [ ] Project health score >70
- [ ] Pre-commit checks passing
- [ ] CI/CD pipeline green

### **Long-term Goals**
- [ ] Project health score >85
- [ ] <5% of files are outliers
- [ ] Average function purity >70
- [ ] Complexity trend decreasing

## 🚨 Warning Signs

### **Red Flags**
- Project health score <50
- >20% of files are outliers
- Average function purity <40
- Complexity trend increasing

### **Action Required**
- Immediate refactoring sprint
- Architecture review meeting
- Development methodology training
- Consider architectural patterns

## 📚 Additional Resources

- [Foundation Architecture Discipline](./FOUNDATION_PROGRESS.md)
- [Module Extraction Guidelines](./MODULE_EXTRACTION_GUIDELINES.md)
- [Function Purity Best Practices](./FUNCTION_PURITY_GUIDE.md)
- [Statistical Analysis Examples](./STATISTICAL_EXAMPLES.md)

---

**Remember**: This system grows with your project. As you add features and the codebase expands, the statistical thresholds adapt automatically. Focus on following the development methodology, and the system will guide you when outliers appear.
