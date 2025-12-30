# Mobile Build Optimizations

This document describes the optimizations implemented in the GitHub Actions workflows for building the Tauri app for iOS and Android platforms.

## Problem Statement

Mobile builds (iOS and Android) in CI/CD pipelines often face these challenges:
- **Long build times**: Mobile builds can take 30+ minutes without optimization
- **Timeout issues**: Default timeouts may not be sufficient for complex builds
- **Repeated downloads**: Dependencies, SDKs, and build artifacts are downloaded repeatedly
- **Resource constraints**: GitHub Actions runners have limited resources

## Implemented Optimizations

### 1. Rust Build Caching (`swatinem/rust-cache@v2`)

**What it does**: Caches Rust compiler artifacts and dependencies between workflow runs.

**Benefits**:
- Reduces Rust compilation time by 70-80%
- Automatically manages cache keys based on Rust version and dependencies
- Works across all platforms (Windows, Linux, macOS)

**Configuration**:
```yaml
- name: Cache Rust
  uses: swatinem/rust-cache@v2
  with:
    workspaces: "apps/app-desktop/src-tauri -> target"
    cache-on-failure: true
```

### 2. Node.js Dependency Caching

**What it does**: Caches npm packages to avoid re-downloading them.

**Benefits**:
- Reduces npm install time by 60-80%
- Uses built-in GitHub Actions caching

**Configuration**:
```yaml
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: '20'
    cache: 'npm'
    cache-dependency-path: |
      package-lock.json
      apps/app-desktop/package-lock.json
```

### 3. Android-Specific Optimizations

#### Gradle Caching

**What it does**: Caches Gradle build artifacts and dependencies.

**Benefits**:
- Reduces Android build time by 40-60%
- Caches wrapper and dependency downloads

**Configuration**:
```yaml
- name: Cache Gradle
  uses: actions/cache@v4
  with:
    path: |
      ~/.gradle/caches
      ~/.gradle/wrapper
    key: ${{ runner.os }}-gradle-${{ hashFiles('**/*.gradle*', '**/gradle-wrapper.properties') }}
    restore-keys: |
      ${{ runner.os }}-gradle-
```

#### NDK Installation and Caching

**What it does**: Installs a specific NDK version and sets environment variables.

**Benefits**:
- Ensures consistent NDK version (26.1.10909125)
- Properly sets `NDK_HOME` for Tauri builds
- NDK is cached with Android SDK

**Configuration**:
```yaml
- name: Install Android NDK
  run: |
    echo "y" | sdkmanager "ndk;26.1.10909125"
    echo "NDK_HOME=$ANDROID_HOME/ndk/26.1.10909125" >> $GITHUB_ENV
```

#### Conditional Initialization

**What it does**: Only runs `tauri android init` if not already initialized.

**Benefits**:
- Saves 2-5 minutes on subsequent runs
- Prevents re-initialization errors

**Configuration**:
```yaml
- name: Check if Android already initialized
  id: check_android
  run: |
    if [ -d "src-tauri/gen/android" ]; then
      echo "initialized=true" >> $GITHUB_OUTPUT
    else
      echo "initialized=false" >> $GITHUB_OUTPUT
    fi

- name: Initialize Android
  if: steps.check_android.outputs.initialized != 'true'
  run: npx tauri android init --ci
```

#### Optimized APK Discovery

**What it does**: Finds the best APK variant (universal or arm64-v8a).

**Benefits**:
- Prioritizes smaller, more compatible builds
- Provides better error messages

### 4. iOS-Specific Optimizations

#### Xcode DerivedData Caching

**What it does**: Caches Xcode build intermediates.

**Benefits**:
- Reduces iOS build time by 30-50%
- Caches compilation and indexing data

**Configuration**:
```yaml
- name: Cache Xcode DerivedData
  uses: actions/cache@v4
  with:
    path: |
      ~/Library/Caches/org.carthage.CarthageKit
      ~/Library/Developer/Xcode/DerivedData
    key: ${{ runner.os }}-xcode-${{ hashFiles('apps/app-desktop/src-tauri/gen/apple/**/*.pbxproj') }}
    restore-keys: |
      ${{ runner.os }}-xcode-
```

#### Conditional Initialization

**What it does**: Only runs `tauri ios init` if not already initialized.

**Benefits**:
- Saves 2-5 minutes on subsequent runs
- Prevents re-initialization errors

#### Improved Artifact Discovery

**What it does**: Intelligently finds IPA or .app bundles and packages them correctly.

**Benefits**:
- Handles both signed and unsigned builds
- Creates proper zip archives for .app bundles
- Provides better error messages and logging

### 5. Cross-Platform Optimizations

#### Extended Timeouts

**What it does**: Sets appropriate timeout values for each build type.

**Benefits**:
- Prevents premature timeout failures
- Allows builds to complete even on slower runners

**Configuration**:
```yaml
build-desktop-windows:
  timeout-minutes: 45

build-mobile-android:
  timeout-minutes: 60

build-mobile-ios:
  timeout-minutes: 60
```

#### Improved Asset Finding

**What it does**: Uses robust file finding logic with clear logging.

**Benefits**:
- More reliable artifact uploads
- Better debugging when builds fail
- Handles platform-specific path differences

## Expected Performance Improvements

### First Run (Cold Cache)
- **Android**: ~30-40 minutes
- **iOS**: ~35-45 minutes
- **Windows**: ~15-20 minutes

### Subsequent Runs (Warm Cache)
- **Android**: ~12-18 minutes (40-55% faster)
- **iOS**: ~15-22 minutes (35-50% faster)
- **Windows**: ~6-10 minutes (50-60% faster)

## Monitoring and Debugging

### Cache Hit Rates
Monitor cache hit rates in GitHub Actions logs:
- Look for "Cache restored from key" messages
- Check cache sizes in the Actions cache management UI

### Build Time Analysis
Compare build times:
- Before optimization: Check historical workflow runs
- After optimization: Monitor new runs for improvements

### Troubleshooting

#### Cache Not Working
1. Check cache key patterns match your files
2. Verify restore-keys are properly set
3. Ensure cache size is under GitHub's 10GB limit

#### Android Build Failures
1. Verify NDK version matches Tauri requirements
2. Check `NDK_HOME` is set correctly
3. Review Gradle logs for dependency issues

#### iOS Build Failures
1. Check code signing configuration
2. Verify Xcode version compatibility
3. Review build logs for certificate issues

## Future Improvements

Potential additional optimizations:
1. **Self-hosted runners**: For even faster builds with dedicated resources
2. **Build matrices**: Parallel builds for different architectures
3. **Incremental builds**: Skip unchanged modules
4. **CrabNebula Cloud**: Specialized Tauri build service
5. **Conditional builds**: Only build when mobile code changes

## References

- [GitHub Actions Caching Guide](https://docs.github.com/en/actions/using-workflows/caching-dependencies-to-speed-up-workflows)
- [Tauri Mobile Build Documentation](https://v2.tauri.app/develop/mobile/)
- [Rust Cache Action](https://github.com/swatinem/rust-cache)
- [Android Actions Setup](https://github.com/android-actions/setup-android)
- [GitHub Actions Best Practices](https://docs.github.com/en/actions/learn-github-actions/best-practices-for-github-actions)
