FROM electronuserland/builder:wine

# set cache dirs
ENV ELECTRON_CACHE "/root/.cache/electron"
ENV ELECTRON_BUILDER_CACHE "/root/.cache/electron-builder"

RUN mkdir /app
COPY . /app

WORKDIR /app

# set version
ARG VERSION
RUN sed -i -e "s/\"version\": \"0.0.1\"/\"version\": \"${VERSION}\"/g" package.json

# install dependencies
RUN npm install

# browserify coin-lib
RUN npm run browserify-coinlib

# build and package 
RUN npm run electron:build:windows