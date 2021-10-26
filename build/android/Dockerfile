FROM beevelop/ionic:v2021.06.1

RUN apt-get update -y && apt-get install -y \
    bzip2 \
    build-essential  \
    pkg-config  \
    libjpeg-dev \
    libcairo2-dev \
    openjdk-11-jdk-headless

ENV JAVA_HOME=/usr/lib/jvm/java-11-openjdk-amd64

# create app directory
RUN mkdir /app
WORKDIR /app

RUN npm install -g npm@7.7.6 @capacitor/core@3.2.5 @capacitor/android@3.2.5 @capacitor/cli@3.2.5
RUN npm cache clean -f
RUN npm install -g n
RUN n 15.14.0

# Install app dependencies, using wildcard if package-lock exists
COPY package.json /app/package.json
COPY package-lock.json /app/package-lock.json
COPY config /app/config
COPY apply-diagnostic-modules.js /app

# install dependencies
RUN npm i

# copy capacitor configs and ionic configs
COPY capacitor.config.ts /app/capacitor.config.ts
COPY ionic.config.json /app/ionic.config.json

RUN mkdir www

# run ionic android build
RUN ionic info

# Bundle app source
COPY . /app

# post-install hook, to be safe if it got cached
RUN node config/patch_crypto.js

# set version code
ARG BUILD_NR
RUN sed -i -e "s/versionCode 1/versionCode $BUILD_NR/g" /app/android/app/build.gradle

# disable pure getters due to https://github.com/angular/angular-cli/issues/11439 
# configure mangle (keep_fnames) for bitcoinjs https://github.com/bitcoinjs/bitcoinjs-lib/issues/959
RUN npm run prepare-prod-build

# remove unused cordova-diagnostic-plugin features
RUN npm run apply-diagnostic-modules

# browserify coin-lib
RUN npm run browserify-coinlib

# jetify dependencies
RUN npx jetifier

# build ionic
RUN ionic build --prod

# copy ionic build
RUN cap sync android

# accept licenses
RUN echo y | sdkmanager --sdk_root=${ANDROID_SDK_ROOT} --update

# clean project
RUN /app/android/gradlew --project-dir /app/android clean

# build apk
RUN /app/android/gradlew --project-dir /app/android build

# copy release-apk
RUN cp /app/android/app/build/outputs/apk/playstore/release/app-playstore-release-unsigned.apk android-release-unsigned.apk

RUN cp android-release-unsigned.apk android-debug.apk

# sign using debug key
RUN jarsigner -verbose -keystore ./build/android/debug.keystore -storepass android -keypass android android-debug.apk androiddebugkey
