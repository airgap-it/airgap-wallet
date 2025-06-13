# AirGap Wallet Fork with Cardano Integration

This fork adds **Cardano (ADA)** support to AirGap Wallet.

## Prerequisites

- NixOS or Nix package manager
- GitHub Personal Access Token with `read:packages` and `write:packages` scopes

## 1. Publish Cardano Package

First, publish the Cardano module from the `airgap-iso-cardano` repository:

```bash
cd ../airgap-iso-cardano
export GITHUB_TOKEN=ghp_YOUR_TOKEN_HERE
npm run publish-cardano-package
```

**The following instructions assume the Cardano package was published successfully.**

## 2. Wallet Build

### Setup Environment

```bash
# Set GitHub token
export GITHUB_TOKEN=ghp_YOUR_TOKEN_HERE

# Enter Nix development environment
nix develop
android
```

### Install Dependencies

```bash
# Clean install with locked dependency versions
rm -rf node_modules
npm install --legacy-peer-deps
```

### Build APK

```bash
# Build web assets
npm run build:prod

# Sync to Android
npx cap sync android

# Build APK
cd android
./gradlew --stop && ./gradlew assembleDebug
```

## 3. Configuration

### Required Files

- `.npmrc` - GitHub Packages authentication
- `package.json` - Cardano dependency and locked versions
- `src/app/app.component.ts` - Cardano module registration

### Key Dependencies

```json
{
  "@apex-fusion/cardano": "0.13.40",
}
```

The Cardano package is self-contained with all dependencies bundled. Several other dependency versions are locked to prevent conflicts introduced by Cardano integration.

## 4. Troubleshooting

### Authentication Issues
```bash
# Test GitHub Packages access
npm whoami --registry=https://npm.pkg.github.com
```

### Build Issues
```bash
# Clear build cache
npm run clean && rm -rf www
cd android && ./gradlew clean
```

### Dependency Conflicts
```bash
# Reinstall with locked versions
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

## Success Indicators

✅ APK builds successfully (~107-108MB)  
✅ No TypeScript compilation errors  
✅ Cardano module loads alongside existing cryptocurrencies  

---

*This setup enables Cardano support in AirGap Wallet while maintaining compatibility with all existing cryptocurrencies.*
