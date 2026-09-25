FROM node:20

# See https://crbug.com/795759
RUN apt-get update && apt-get install -yq --no-install-recommends libgconf-2-4 bzip2 build-essential libxtst6
RUN apt-get install -yq --no-install-recommends git

# Required by @ledgerhq dependencies
RUN apt-get install -y --no-install-recommends libusb-1.0-0

# Install latest chrome dev package and fonts to support major charsets (Chinese, Japanese, Arabic, Hebrew, Thai and a few others)
# Note: this installs the necessary libs to make the bundled version of Chromium that Puppeteer
# installs, work.
RUN apt-get update && apt-get install -y wget --no-install-recommends \
	&& wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
	&& sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
	&& apt-get update \
	&& apt-get install -y --no-install-recommends google-chrome-unstable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
	--no-install-recommends --allow-unauthenticated \
	&& rm -rf /var/lib/apt/lists/* \
	&& apt-get purge --auto-remove -y curl \
	&& rm -rf /src/*.deb

# install static webserver
RUN npm install node-static -g

# create app directory, owned by the unprivileged node user
RUN mkdir /app && chown node:node /app
WORKDIR /app
USER node

# Install app dependencies, using wildcard if package-lock exists
COPY --chown=node:node package.json /app
COPY --chown=node:node package-lock.json /app
COPY --chown=node:node config /app/config
COPY --chown=node:node apply-diagnostic-modules.js /app
COPY --chown=node:node fix-qrscanner-gradle.js /app
COPY --chown=node:node patch-dependency-versions.js /app
COPY --chown=node:node patch-coinlib.js /app
COPY --chown=node:node copy-builtin-modules.js /app
COPY --chown=node:node browserify-coinlib.js /app

# install dependencies
RUN npm install --legacy-peer-deps

# Bundle app source
COPY --chown=node:node . /app

# browserify coin-lib
RUN npm run browserify-coinlib

# set to production
ENV NODE_ENV=production

# build
RUN npm run build:prod

HEALTHCHECK CMD node -e "require('http').get('http://localhost:8100', (r) => process.exit(r.statusCode < 500 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["static", "-p", "8100", "-a", "0.0.0.0", "www"]
