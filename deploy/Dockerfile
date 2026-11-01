# Runtime image: the API is already bundled into server.cjs and the web app built into public/.
FROM node:22-alpine
ENV NODE_ENV=production \
    PORT=8080 \
    PUBLIC_DIR=/app/public
WORKDIR /app
COPY server.cjs server.cjs.map ./
COPY public ./public
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s CMD wget -qO- http://127.0.0.1:8080/api/health || exit 1
CMD ["node", "--enable-source-maps", "server.cjs"]
