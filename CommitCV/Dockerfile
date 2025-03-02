## multistage image, wish we could use this but it doesn't load the .env variables :(

## use the official Bun image
## see all versions at https://hub.docker.com/r/oven/bun/tags
#FROM oven/bun:1 AS base
#WORKDIR /usr/src/app
#
## install dependencies into temp directory
## this will cache them and speed up future builds
#FROM base AS install
#RUN mkdir -p /temp/dev
#COPY package.json bun.lock /temp/dev/
#RUN cd /temp/dev && bun install --frozen-lockfile
#
## install with --production (exclude devDependencies)
#RUN mkdir -p /temp/prod
#COPY package.json bun.lock /temp/prod/
#RUN cd /temp/prod && bun install --frozen-lockfile --production
#
## copy node_modules from temp directory
## then copy all (non-ignored) project files into the image
#FROM base AS prerelease
#COPY --from=install /temp/dev/node_modules node_modules
#COPY . .
#
## [optional] tests & build
#ENV NODE_ENV=production
#RUN bun test
#RUN bun run build
#
## Copy production dependencies and source code into final image
#FROM base AS release
#COPY --from=install /temp/prod/node_modules node_modules
#COPY --from=prerelease /usr/src/app/.next ./.next
#COPY --from=prerelease /usr/src/app/public ./public
#COPY --from=prerelease /usr/src/app/package.json .
#
## Expose the port from the .env file
#ARG COMMITCV_PORT
#ENV COMMITCV_PORT=${COMMITCV_PORT}
#EXPOSE ${COMMITCV_PORT}
#
## Run the app
#USER bun
#ENTRYPOINT [ "bun", "run", "start" ]

# Use the official Bun image
# see all versions at https://hub.docker.com/r/oven/bun/tags
FROM oven/bun:1
WORKDIR /usr/src/app

# Copy package files and install dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy all project files
COPY . .

# Set environment to production
ENV NODE_ENV=production

ARG NEXT_PUBLIC_PDF_ENDPOINT
#ENV NEXT_PUBLIC_PDF_ENDPOINT=${NEXT_PUBLIC_PDF_ENDPOINT}

RUN echo "NEXT_PUBLIC_PDF_ENDPOINT=${NEXT_PUBLIC_PDF_ENDPOINT}" >> .env

# Run tests and build the application
RUN bun test
RUN bun run build

# Expose the port from the .env file
ARG COMMITCV_PORT
ENV COMMITCV_PORT=${COMMITCV_PORT}
EXPOSE ${COMMITCV_PORT}

# Run the app
USER bun
ENTRYPOINT [ "bun", "run", "start" ]
