# 1. BUILD STAGE
FROM node:22 AS build
USER node
WORKDIR /app
COPY --chown=node:node . .

# Installiert ALLES (auch devDependencies für Gulp)
RUN yarn install --network-timeout 1000000 --network-concurrency 1
RUN yarn gulp release

# 2. DEPENDENCY CLEANUP STAGE (Optional aber schick)
# Wir werfen die devDependencies weg, damit das Image klein bleibt
RUN rm -rf node_modules
RUN yarn install --production --frozen-lockfile && yarn cache clean

# 3. DEPLOY STAGE
FROM node:22-slim AS deploy
LABEL org.opencontainers.image.source=https://github.com/leylines/leylinesMap

USER node
WORKDIR /app

# Wir kopieren die gesäuberten node_modules komplett
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/wwwroot ./wwwroot
COPY --from=build /app/serverconfig.json ./serverconfig.json
COPY --from=build /app/package.json ./package.json
# ... weitere Files

EXPOSE 3001
ENV NODE_ENV=production

# Dein Startbefehl
CMD [ "node", "./node_modules/leylines-server/lib/app.js", "--config-file", "serverconfig.json" ]
