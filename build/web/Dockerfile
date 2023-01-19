FROM node:16.13.1 as build

# create app directory
RUN mkdir /app
WORKDIR /app

# Install app dependencies, using wildcard if package-lock exists
COPY package.json /app
COPY package-lock.json /app
COPY config /app/config
COPY apply-diagnostic-modules.js /app
COPY fix-qrscanner-gradle.js /app
COPY patch-dependency-versions.js /app
COPY patch-coinlib.js /app

# install dependencies
RUN npm install

# browserify coin-lib
RUN npm run browserify-coinlib

# Bundle app source
COPY . /app

# set to production
RUN export NODE_ENV=production

# post-install hook, to be safe if it got cached
RUN node config/patch_crypto.js

# build
RUN npx ionic build --prod

###################################

FROM nginx:1-alpine

COPY --from=build /app/www /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD [ "nginx", "-g", "daemon off;" ]
