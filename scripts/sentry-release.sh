#!/bin/bash
# Sentry Release Script
# Run this during deployment to create a new release in Sentry
#
# Required environment variables:
#   SENTRY_AUTH_TOKEN - Your Sentry auth token (create at https://sentry.io/settings/auth-tokens/)
#
# Usage:
#   ./scripts/sentry-release.sh
#   SENTRY_AUTH_TOKEN=xxx ./scripts/sentry-release.sh

set -e

# Configuration
export SENTRY_ORG="activi-0m"
export SENTRY_PROJECT="cloud-agents-backend"

# Check for auth token
if [ -z "$SENTRY_AUTH_TOKEN" ]; then
    echo "❌ SENTRY_AUTH_TOKEN not set"
    echo "   Create a token at: https://sentry.io/settings/auth-tokens/"
    echo "   Then run: SENTRY_AUTH_TOKEN=xxx ./scripts/sentry-release.sh"
    exit 1
fi

# Get version from git or package.json
if command -v git &> /dev/null && git rev-parse --git-dir &> /dev/null; then
    VERSION=$(sentry-cli releases propose-version 2>/dev/null || git rev-parse --short HEAD)
else
    VERSION=$(node -p "require('./package.json').version" 2>/dev/null || echo "0.1.0")
fi

echo "🚀 Creating Sentry release: $VERSION"
echo "   Organization: $SENTRY_ORG"
echo "   Project: $SENTRY_PROJECT"

# Create new release
echo "📦 Creating release..."
sentry-cli releases new "$VERSION"

# Associate commits (if git is available)
if command -v git &> /dev/null && git rev-parse --git-dir &> /dev/null; then
    echo "🔗 Associating commits..."
    sentry-cli releases set-commits "$VERSION" --auto || echo "⚠️ Could not associate commits (this is optional)"
fi

# Finalize the release
echo "✅ Finalizing release..."
sentry-cli releases finalize "$VERSION"

# Mark release as deployed
echo "🎯 Marking as deployed..."
sentry-cli releases deploys "$VERSION" new -e production

echo ""
echo "✅ Sentry release $VERSION created successfully!"
echo "   View at: https://sentry.io/organizations/$SENTRY_ORG/releases/$VERSION/"
