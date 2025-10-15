#!/bin/bash

echo "🔥 Deploying Firebase Firestore Rules..."

# Check if user is logged in
firebase login:list > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "❌ You need to login to Firebase first"
    echo "Run: firebase login"
    exit 1
fi

# Deploy only Firestore rules
echo "📋 Deploying Firestore rules..."
firebase deploy --only firestore:rules --project candywarz-6fea9

if [ $? -eq 0 ]; then
    echo "✅ Firestore rules deployed successfully!"
else
    echo "❌ Failed to deploy Firestore rules"
    exit 1
fi

# Deploy indexes
echo "📊 Deploying Firestore indexes..."
firebase deploy --only firestore:indexes --project candywarz-6fea9

if [ $? -eq 0 ]; then
    echo "✅ Firestore indexes deployed successfully!"
else
    echo "⚠️  Failed to deploy indexes (you may need to create them manually in Firebase Console)"
fi

echo "🎉 Deployment complete!"