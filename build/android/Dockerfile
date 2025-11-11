FROM beevelop/ionic:v2023.10.1

RUN apt-get update -y && apt-get install -y \
    bzip2 \
    build-essential  \
    pkg-config  \
    libjpeg-dev \
    libcairo2-dev \
    openjdk-21-jdk-headless

ENV JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64

# create app directory
RUN mkdir /app
WORKDIR /app

RUN npm install -g npm@10.5.2 @capacitor/core@5.0.4 @capacitor/android@5.0.4 @capacitor/cli@5.0.4
RUN npm cache clean -f
RUN npm install -g n
RUN n 20.13.1

# Install app dependencies, using wildcard if package-lock exists
COPY package.json /app
COPY package-lock.json /app
COPY config /app/config
COPY apply-diagnostic-modules.js /app
COPY fix-qrscanner-gradle.js /app
COPY patch-dependency-versions.js /app
COPY patch-coinlib.js /app
COPY copy-builtin-modules.js /app
COPY browserify-coinlib.js /app

# install dependencies
RUN npm i --legacy-peer-deps

# copy capacitor configs and ionic configs
COPY capacitor.config.ts /app/capacitor.config.ts
COPY ionic.config.json /app/ionic.config.json

RUN mkdir www

# run ionic android build
RUN ionic info

# Bundle app source
COPY . /app

# set version code
ARG BUILD_NR
RUN sed -i -e "s/versionCode 1/versionCode $BUILD_NR/g" /app/android/app/build.gradle

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
RUN zipalign -p -f -v 4 android-debug.apk android-debug-aligned.apk \
    && apksigner sign --ks ./build/android/debug.keystore --ks-key-alias androiddebugkey --ks-pass pass:android --key-pass pass:android android-debug-aligned.apk
