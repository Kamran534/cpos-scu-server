#!/bin/bash
# Script to push Prisma schema to PostgreSQL database

echo "Pushing Prisma schema to PostgreSQL database..."
npx prisma db push

if [ $? -eq 0 ]; then
    echo "✅ Schema pushed successfully!"
    echo "Generating Prisma client..."
    npx prisma generate
    echo "✅ Done!"
else
    echo "❌ Failed to push schema. Check database connection."
    exit 1
fi

