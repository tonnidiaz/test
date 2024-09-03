# syntax = docker/dockerfile:1

# Adjust NODE_VERSION as desired
ARG NODE_VERSION=20.13.1
FROM node:${NODE_VERSION}-slim as base

LABEL fly_launch_runtime="Node.js"

# Node.js app lives here
WORKDIR /app
# Set production environment
ENV NODE_ENV="production"

# Throw-away build stage to reduce size of final image
FROM base as build


# Install packages needed to build node modules
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential node-gyp pkg-config python-is-python3

    
# Install node modules
COPY --link package-lock.json package.json ./
RUN npm ci --include=dev

#COPY tsconfig.json ./
#COPY src ./src
COPY --link . .
RUN npm run build
# Final stage for app image
FROM base

COPY --from=build /app /app 
# /app/package*.json ./
#RUN npm install --only=production


COPY --from=build /app/dist ./dist

EXPOSE 3000
CMD ["node", "dist/index.js"]