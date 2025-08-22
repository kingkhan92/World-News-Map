# Docker Image Accessibility Fix

## 🚨 Issue
Users getting "denied" errors when trying to pull Docker images:
```
Error Head "https://ghcr.io/v2/kingkhan92/interactive-world-news-map-backend/manifests/latest": denied
```

## ✅ Solutions

### Option 1: Automatic Fix (Recommended)
The GitHub Actions workflow has been updated and will automatically:
1. Build and publish images on every push to main
2. Make images publicly accessible
3. Test image accessibility

**The workflow is now running and should fix the issue within 5-10 minutes.**

### Option 2: Manual Fix (Immediate)
If you need images right now, run the manual publish script:

**Linux/Mac:**
```bash
chmod +x scripts/publish-images.sh
./scripts/publish-images.sh
```

**Windows:**
```powershell
.\scripts\publish-images.ps1
```

### Option 3: Use Local Build (Always Works)
Use the local build version that builds from source:
```bash
docker-compose -f docker-compose.minimal-local.yml up -d --build
```

## 🔧 What Was Fixed

1. **Updated GitHub Actions workflow** (`.github/workflows/build-images.yml`):
   - Added `workflow_dispatch` for manual triggers
   - Added steps to make images public
   - Added image accessibility testing
   - Added minimal deployment testing

2. **Created manual publish scripts**:
   - `scripts/publish-images.sh` (Linux/Mac)
   - `scripts/publish-images.ps1` (Windows)

3. **Enhanced CI/CD pipeline**:
   - Tests image pulling after build
   - Validates minimal deployment works
   - Ensures images are publicly accessible

## 📋 Status Check

After the workflow completes, you can verify images are accessible:

```bash
# Test pulling images
docker pull ghcr.io/kingkhan92/interactive-world-news-map-backend:latest
docker pull ghcr.io/kingkhan92/interactive-world-news-map-frontend:latest

# Test minimal deployment
docker-compose -f docker-compose.minimal.yml up -d
```

## 🎯 Expected Timeline

- **Automatic fix**: 5-10 minutes after push (GitHub Actions)
- **Manual fix**: Immediate (run publish scripts)
- **Local build**: Always works (builds from source)

## 🔍 Verification

Once fixed, these commands should work without errors:
```bash
# Download and test minimal deployment
curl -O https://raw.githubusercontent.com/kingkhan92/interactive-world-news-map/main/docker-compose.minimal.yml
docker-compose -f docker-compose.minimal.yml pull
```

The issue should be resolved automatically by the updated GitHub Actions workflow!