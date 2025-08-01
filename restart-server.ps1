# Script để restart server một cách sạch sẽ
Write-Host "🔄 Restarting server..." -ForegroundColor Yellow

# Dừng tất cả node processes (cẩn thận!)
Write-Host "🛑 Stopping existing node processes..." -ForegroundColor Red
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force

# Đợi một chút để processes dừng hoàn toàn
Start-Sleep -Seconds 2

# Kiểm tra port 3001 có còn được sử dụng không
$port3001 = netstat -ano | findstr :3001
if ($port3001) {
    Write-Host "⚠️  Port 3001 is still in use:" -ForegroundColor Yellow
    Write-Host $port3001
} else {
    Write-Host "✅ Port 3001 is free" -ForegroundColor Green
}

Write-Host ""
Write-Host "🚀 Starting server with npm run start:dev..." -ForegroundColor Green
Write-Host "📝 Make sure .env file exists with correct Stripe credentials" -ForegroundColor Cyan
Write-Host ""

# Start server
npm run start:dev
