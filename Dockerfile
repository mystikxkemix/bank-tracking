# Builds the whole monorepo, then ships one small runtime image: the API bundle
# (server.cjs, shared package included) serving the built web app from public/.
FROM node:22-alpine AS build
WORKDIR /app
COPY . .
RUN npm ci --include=dev --no-fund --no-audit && npm run build

FROM node:22-alpine
# Version of the image, e.g. 2.12 (set by CI; "dev" for local builds).
ARG VERSION=dev
ENV APP_VERSION=$VERSION \
    NODE_ENV=production \
    PORT=8080 \
    PUBLIC_DIR=/app/public
WORKDIR /app
COPY --from=build /app/apps/api/dist/server.cjs /app/apps/api/dist/server.cjs.map ./
COPY --from=build /app/apps/web/dist ./public
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s CMD wget -qO- http://127.0.0.1:8080/api/health || exit 1
CMD ["node", "--enable-source-maps", "server.cjs"]
