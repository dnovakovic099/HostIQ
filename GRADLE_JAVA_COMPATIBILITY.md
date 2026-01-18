# Gradle and Java Version Compatibility

## Current Configuration

- **Gradle Version**: 8.11.1
- **Android Gradle Plugin**: 7.4.2

## Required Java Version

According to the [Gradle Compatibility Matrix](https://docs.gradle.org/current/userguide/compatibility.html):

### Gradle 8.11.1 Requirements
- **Minimum**: Java 8 (for running Gradle)
- **Recommended**: Java 17 or Java 21 (LTS versions)
- **Supported Range**: Java 8 to Java 22

### Android Gradle Plugin 7.4.2 Requirements
- **Minimum**: Java 11
- **Recommended**: Java 17

## Recommended Setup

**Install Java 17 (LTS)** - This is the best choice because:
1. It's an LTS (Long Term Support) version
2. Fully compatible with Gradle 8.11.1
3. Required minimum for Android Gradle Plugin 7.4.2 optimal performance
4. Supported for compilation and testing

## Installation Instructions

### macOS (using Homebrew)

```bash
# Install Java 17
brew install openjdk@17

# Link it
sudo ln -sfn /opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk /Library/Java/JavaVirtualMachines/openjdk-17.jdk

# Set JAVA_HOME (add to ~/.zshrc or ~/.bash_profile)
export JAVA_HOME=$(/usr/libexec/java_home -v 17)
```

### Verify Installation

```bash
java -version
# Should show: openjdk version "17.x.x"

echo $JAVA_HOME
# Should show path to Java 17 installation
```

## Configuration

The `gradle.properties` file has been configured with a placeholder for Java home. Once you install Java 17, you can optionally set:

```properties
org.gradle.java.home=/Library/Java/JavaVirtualMachines/openjdk-17.jdk/Contents/Home
```

**Note**: If you don't set `org.gradle.java.home`, Gradle will automatically use the Java version from your `JAVA_HOME` environment variable or system PATH.

## Alternative: Java 21

If you prefer the newer LTS version, Java 21 is also fully supported:
- Compatible with Gradle 8.11.1
- Works with Android Gradle Plugin 7.4.2

## Compatibility Table Reference

| Java Version | Gradle 8.11.1 Support | Notes |
|--------------|----------------------|-------|
| Java 8       | ✅ Yes               | Minimum for Gradle 8.x |
| Java 11      | ✅ Yes               | Minimum for AGP 7.4.2 |
| Java 17      | ✅ Yes (Recommended) | LTS, optimal performance |
| Java 21      | ✅ Yes               | LTS, newer features |
| Java 22      | ✅ Yes               | Latest supported |

## Troubleshooting

If you encounter Java version errors:

1. Check your current Java version:
   ```bash
   java -version
   ```

2. Verify JAVA_HOME is set correctly:
   ```bash
   echo $JAVA_HOME
   ```

3. Update your shell profile (~/.zshrc or ~/.bash_profile):
   ```bash
   export JAVA_HOME=$(/usr/libexec/java_home -v 17)
   ```

4. Restart your terminal or run:
   ```bash
   source ~/.zshrc  # or source ~/.bash_profile
   ```

5. For Android Studio builds, ensure Android Studio is configured to use the correct JDK:
   - Preferences → Build, Execution, Deployment → Build Tools → Gradle → Gradle JDK
   - Select "jbr-17" or your installed Java 17

## References

- [Gradle Compatibility Matrix](https://docs.gradle.org/current/userguide/compatibility.html)
- [Android Gradle Plugin Compatibility](https://developer.android.com/studio/releases/gradle-plugin)
