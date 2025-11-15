#!/bin/bash
echo "Checking for Next.js processes..."
echo ""

# Check common Next.js ports
for port in 3000 3001 3002 3003; do
  if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "✅ Found process on port $port"
    echo "   Dashboard should be at: http://localhost:$port"
    lsof -Pi :$port -sTCP:LISTEN
    echo ""
  fi
done

echo "If no ports found, the server might not be running."
echo "Start it with: npm run dev"

