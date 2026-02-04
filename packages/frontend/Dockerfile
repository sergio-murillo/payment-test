FROM node:18-alpine AS base

WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package*.json ./
RUN npm i

# Build
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Ensure public directory exists (Next.js standalone needs it)
RUN mkdir -p public
RUN npm run build

# Production
FROM base AS runner
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone output (Next.js includes public in standalone if it exists)
# The standalone output already contains everything needed including public directory
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
