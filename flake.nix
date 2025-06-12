{
  description = "Simple Android dev environment for AirGap Vault with Isolated Modules";
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };
  outputs = { nixpkgs, flake-utils, ... }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs {
          inherit system;
          config = {
            allowUnfree = true;
            android_sdk.accept_license = true;
          };
        };
        # Android SDK setup with ALL required components
        androidSdk = pkgs.androidenv.composeAndroidPackages {
          cmdLineToolsVersion = "19.0";
          buildToolsVersions = [ "30.0.3" "34.0.0" ];
          platformVersions = [ "30" "31" "32" "33" "34" ];
          abiVersions = [ "x86_64" "arm64-v8a" ];
          includeEmulator = false;
          useGoogleAPIs = false;
        };
        # FHS environment that can run any Linux binary
        androidEnv = pkgs.buildFHSEnv {
          name = "android";
          targetPkgs = pkgs: with pkgs; [
            nodejs_20
            yarn
            jdk17
            git
            gradle
            androidSdk.androidsdk
            # Essential libs for Android tools
            glibc zlib ncurses5 stdenv.cc.cc.lib
          ];
          profile = ''
            # Stop any existing Gradle daemons that might be running outside the FHS environment
            ./gradlew --stop 2>/dev/null || true

            # Use direct SDK path instead of find command
            NIXSDK="${androidSdk.androidsdk}/libexec/android-sdk"

            # Create writable Android SDK automatically
            export ANDROID_SDK_ROOT="/tmp/android-sdk-writable-$$"
            mkdir -p $ANDROID_SDK_ROOT

            # Copy SDK with direct path
            if [ -d "$NIXSDK" ]; then
              cp -r $NIXSDK/* $ANDROID_SDK_ROOT/
              chmod -R u+w $ANDROID_SDK_ROOT
            else
              echo "Warning: Could not find Android SDK"
              export ANDROID_SDK_ROOT="$NIXSDK"
            fi

            export ANDROID_HOME="$ANDROID_SDK_ROOT"
            export JAVA_HOME="${pkgs.jdk17}/lib/openjdk"
            export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/build-tools/34.0.0:$ANDROID_HOME/build-tools/30.0.3:$PATH"

            # Auto-create local.properties in android directory if it exists
            if [ -d "android" ]; then
              echo "sdk.dir=$ANDROID_HOME" > android/local.properties
            fi

            # Also create in current directory for convenience
            echo "sdk.dir=$ANDROID_HOME" > local.properties

            # Set Gradle daemon options to ensure it runs in the correct environment
            export GRADLE_OPTS="-Dorg.gradle.daemon=true -Dorg.gradle.jvmargs=-Xmx4g"

            echo "===== AirGap Vault Development Environment ====="
            echo "Java: $(java -version 2>&1 | head -1)"
            echo "JAVA_HOME: $JAVA_HOME"
            echo "Android SDK: $ANDROID_HOME"
            echo "✅ Environment ready for building!"
            echo "To build APK: cd android && ./gradlew --stop && ./gradlew assembleDebug"
            echo "=================================================="
          '';
        };
      in {
        devShells.default = pkgs.mkShell {
          buildInputs = [ androidEnv ];
          shellHook = ''
            echo "🚀 AirGap Vault development environment ready!"
            echo "Run: android"
            echo "To build APK: cd android && ./gradlew --stop && ./gradlew assembleDebug"
            echo "For release: cd android && ./gradlew --stop && ./gradlew assembleRelease"
            echo "adb kill-server && adb start-server && adb devices"
            echo "adb install -r app/build/outputs/apk/fdroid/debug/app-fdroid-debug.apk"
          '';
        };
      });
}
