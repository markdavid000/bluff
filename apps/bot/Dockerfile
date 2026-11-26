FROM node:24-slim AS build
WORKDIR /repo
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile --ignore-scripts
RUN pnpm --filter @bluff/contracts compile
RUN pnpm --filter @bluff/bot build
RUN pnpm --filter @bluff/bot deploy --prod --legacy --ignore-scripts /service

FROM node:24-slim
ENV NODE_ENV=production
WORKDIR /service
COPY --from=build /service/package.json ./package.json
COPY --from=build /service/node_modules ./node_modules
COPY --from=build /repo/apps/bot/dist ./dist
USER node
EXPOSE 8080
CMD ["node", "dist/main.js"]
