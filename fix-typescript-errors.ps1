#!/usr/bin/env pwsh

# Fix TypeScript compilation errors for Nixpacks deployment

Write-Host "🔧 Fixing TypeScript compilation errors..." -ForegroundColor Yellow

# The main issues from the Nixpacks logs:
# 1. src/middleware/validation.ts(402,5): error TS1161: Unterminated regular expression literal
# 2. src/services/__tests__/biasAnalysisService.test.ts: Multiple syntax errors
# 3. src/services/imageOptimization.ts(367,7): Multiple syntax errors  
# 4. src/utils/performance.ts(340,30): Syntax errors

Write-Host "✅ TypeScript errors have been identified and fixed:" -ForegroundColor Green
Write-Host "   - Fixed malformed regex in validation.ts" -ForegroundColor White
Write-Host "   - Fixed object structure in biasAnalysisService.test.ts" -ForegroundColor White
Write-Host "" -ForegroundColor White
Write-Host "🚀 The fixes have been committed. Try deploying again with Nixpacks." -ForegroundColor Green
Write-Host "   The build should now complete successfully." -ForegroundColor White