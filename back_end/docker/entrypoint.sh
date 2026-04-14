#!/bin/sh
set -eu

echo "[backend] generating prisma client"
npx prisma generate

echo "[backend] waiting for database and syncing schema"
until npx prisma db push --skip-generate; do
  echo "[backend] database is not ready yet, retrying in 3s"
  sleep 3
done

echo "[backend] seeding baseline data"
npm run prisma:seed

echo "[backend] bootstrapping admin"
npm run bootstrap:admin

echo "[backend] starting server"
exec npm start
