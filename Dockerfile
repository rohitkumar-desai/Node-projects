FROM node:14-buster-slim

# Create work directory
WORKDIR /usr/src/app

ARG NPM_TOKEN

COPY .npmrc .npmrc
COPY package.json package.json
# RUN rm package-lock.json
# RUN rm yarn.lock
RUN npm install && npm install --global nps
RUN rm -f .npmrc

# Copy app source to work directory
COPY . /usr/src/app

# Build and run the app
RUN nps build
USER node
CMD ["nps","start"]
