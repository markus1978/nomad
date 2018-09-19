# Copyright 2018 Markus Scheidgen
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#   http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an"AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

# This docker image is used for the GUI container that serves the static GUI
# files.
#
# This is a multistage build, one stage for building the GUI and one final stage
# intended for the actual GUI container that serves the GUI.

# build environment
FROM node:latest as builder
RUN mkdir -p /nomad/app
WORKDIR /nomad/app
ENV PATH /nomad/app/node_modules/.bin:$PATH
COPY gui/package.json /nomad/app/package.json
COPY gui/yarn.lock /nomad/app/yarn.lock
RUN yarn
COPY gui /nomad/app
COPY .git /nomad

RUN yarn build

# production environment
FROM nginx:1.13.9-alpine
COPY --from=builder /nomad/app/build /app/nomad
CMD ["nginx", "-g", "daemon off;"]
