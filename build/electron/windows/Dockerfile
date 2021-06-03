FROM electronuserland/builder:wine

RUN wget -qO - https://download.opensuse.org/repositories/Emulators:/Wine:/Debian/xUbuntu_18.04/Release.key | apt-key add -
RUN apt-get update -y
RUN apt-get install -y libusb-1.0-0 libudev-dev

# set cache dirs
ENV ELECTRON_CACHE "/root/.cache/electron"
ENV ELECTRON_BUILDER_CACHE "/root/.cache/electron-builder"

RUN mkdir /app
COPY . /app

WORKDIR /app

# set version
ARG VERSION
RUN sed -i -e "s/\"version\": \"0.0.1\"/\"version\": \"${VERSION}\"/g" electron/package.json

# install dependencies
RUN npm install
RUN npm --prefix electron/ install

# configure mangle (keep_fnames) for bitcoinjs https://github.com/bitcoinjs/bitcoinjs-lib/issues/959
RUN npm run prepare-prod-build

# browserify coin-lib
RUN npm run browserify-coinlib

# build Ionic project
RUN npm run build:electron:prod

# copy files
RUN npx cap sync electron

# build package
RUN npm --prefix electron/ run build:windows