---
layout: post
title: Deploying with Docker & AWS
author: james
---

Since I installed [Docker](https://www.docker.com) on my
[personal Ubuntu server](https://www.digitalocean.com/community/tutorials/how-to-install-and-use-docker-on-ubuntu-16-04),
I’ve been diving into the deep end of images & containers. It’s a completely different way of developing applications &
platforms, and now it’s time to bring the Docker way of thinking to my work. Enter
[AWS](https://aws.amazon.com/), [EC2 Container Service](https://aws.amazon.com/ecs/) and
[all of the goodies](https://aws.amazon.com/elasticloadbalancing/applicationloadbalancer/) 😝

[![Yay, who doesn't like Docker]({{ '/img/posts/2016-10-25-docker.png' | relative_url }})](https://www.docker.com/)

At [Car Throttle](https://www.carthrottle.com/) we use [CircleCI](https://circleci.com) for our continuous integration
and there’s no need to revise that decision since
[CircleCI has full support for Docker](https://circleci.com/docs/1.0/docker/) and using the docker commands during a
CI-build is so easy I didn’t need to write any additional bash scripts 😂

Rather than pay for private repos in the Docker Hub, AWS users can use the
[EC2 Container Registry](https://aws.amazon.com/ecr/) that Amazon provides, allowing unlimited private repos for your
projects 😍

This article is split into distinct sections that covers the various stages of a CI-build: **Environment**,
**Dependencies**, **Database**, **Testing** & **Deployment**, followed by a short summary 😎

---

## Environment

To make the various build commands easier to follow there are some specific environment variables that are set every
time a CI build runs. Since I don’t want to undo them for the sake of this article, here’s what they are and what they
represent:

**AWS_ECR_URL** — This is the domain for our AWS EC2 Container Registry, which is where we store our images.

**AWS_ECR_REPO** — This is the name of the repository where all our images are stored. Since these are “**repositories**”
it’s simpler to keep them in the same format as GitHub, therefore all of our production ECR repositories are prefixed
with “**car-throttle/**”.

Don’t forget to enable *docker* in your *circle.yml* file by adding to the list of services:

```yml
machine:
  environment:
    AWS_ECR_URL: 5CF7DD3728E7.imf.ecr.your-region-here.amazonaws.com
    AWS_ECR_REPO: my-awesome-project
  hosts:
    dev.carthrottle.local: 54.91.257.734
  services:
    - docker
```

For simplicity, I added the IP of the staging instance to the *circle.yml* file for staging deployments, forcing me to
never hard-code IP addresses inline 😍

---

## Dependencies

When handling dependencies through Docker, I realised I could fetch images with the **versions of the services we
actually use**, and not have to rely on CircleCI’s preconfigured versions:

```yml
- docker pull mysql:5.6.33
- docker run --detach --name ci-mysql -p 127.0.0.1:13306:3306 --env MYSQL_ALLOW_EMPTY_PASSWORD=yes mysql:5.6.33
- docker pull redis:3.0.7
- docker run --detach --name ci-redis redis:3.0.7
```

It’s relatively easy to download & configure these services with Docker. Most likely this’ll be your typical database /
cache combination, so for the purposes of this article it’s *mysql* & *redis*. These commands fetch specific versions of
[mysql](https://hub.docker.com/_/mysql/) & [redis](https://hub.docker.com/_/redis/) and starts both of them as containers.

```yml
- docker build --build-arg NODE_ENV=testing --rm=false -t "$AWS_ECR_REPO:$CIRCLE_SHA1-testing" .
```

The next command builds a Docker image, tagging it with a -testing suffix to encourage us not to push this build to our
registry. Why? Because in our case, building with *NODE_ENV=testing* installs the *devDependencies* for our project
(required to run tests) and are not desired for production. At all. This functionality is defined in the *Dockerfile*
for this project, which I’ll share at the end of this article.

---

## Database

Having setup our database containers in the **dependencies** section, we need to import our database structure. For the
sake of demonstration, this project only has one file defining the database structure & contents, so it can imported
easily. **Note:** We don’t have to ensure *mysqli-cli* is available, we know it is because CircleCi ships with MySQL
enabled by default, and we can use it to interact with our containerised-database because when we started MySQL with
Docker we exposed a MySQL port 😉

```yml
database:
  override:
    - mysql --host 127.0.0.1 --port 13306 --user root < ./scripts/database.sql
```

---

## Testing

To test our project all we have to do is run the test command in our testing image (built earlier), ensuring we have
linked all the necessary dependency services:

```yml
- docker run --link ci-mysql:mysql --link ci-redis:redis "$AWS_ECR_REPO:$CIRCLE_SHA1-testing" npm test
```

---

## Deploying to a Staging environment

So, dependencies are built, tests have passed, and now it’s time to deploy to the staging environment.

Our staging environment consists of a *Ubuntu:16.04* EC2 instance
[with Docker installed](https://www.digitalocean.com/community/tutorials/how-to-install-and-use-docker-on-ubuntu-16-04)
and pre-configured MySQL/Redis containers
[set to start with systemctl on boot](https://docs.docker.com/engine/admin/start-containers-automatically/).
And to get the images onto the instance the EC2 Container Registry is still used, to mirroring production deployments
as closely as possible.

```yml
- docker build --build-arg NODE_ENV=staging -t "$AWS_ECR_REPO:$CIRCLE_SHA1" .
```

This builds our staging Docker image. Passing in the relevant *NODE_ENV* also stops the build from installing
*devDependencies*, which is expected in production (and therefore in staging too).

```yml
- eval $(aws ecr get-login)
- docker tag "$AWS_ECR_REPO:$CIRCLE_SHA1" "$AWS_ECR_URL/$AWS_ECR_REPO:develop-${CIRCLE_SHA1:0:7}"
- docker push "$AWS_ECR_URL/$AWS_ECR_REPO:develop-${CIRCLE_SHA1:0:7}"
```

Next the CI-build logs into our EC2 Container Registry, add an appropriate tag to the build, and push it up.

```yml
- |
  ssh ubuntu@dev.carthrottle.local << ENDSSH
  docker pull "$AWS_ECR_URL/$AWS_ECR_REPO:develop-${CIRCLE_SHA1:0:7}"
  docker tag "$AWS_ECR_URL/$AWS_ECR_REPO:develop-${CIRCLE_SHA1:0:7}" "$AWS_ECR_REPO:develop-${CIRCLE_SHA1:0:7}"
  docker rmi "$AWS_ECR_URL/$AWS_ECR_REPO:develop-${CIRCLE_SHA1:0:7}"
  docker rm -f my-awesome-project
  start-project.sh "$AWS_ECR_REPO:develop-${CIRCLE_SHA1:0:7}"
  ENDSSH
```

Finally, it SSHs into the staging instance, updates the image and then restarts the container on the machine.

**Note:** `start-project.sh` is a simplified script to (re)start Docker processes for this project, because managing
processes on the server and through CircleCI is a real pain:

```sh
#!/usr/bin/env bash
if [ -z "$1" ]; then
  echo "Missing tag for images"
  exit 1
fi
docker rm -f my-awesome-project
docker run --detach --env-file ~/awesome-project.env --link mysql:mysql --link redis:redis --name my-awesome-project --publish 3001:3000 "$1" node bin/server.js
```

## Deploying to a Production environment

Later on, after pushing enough staging builds to be happy with a feature, it’s time to deploy to production. This
involves (similarly) pushing a (production) build to ECR, but instead of SSH~ing into production instances and reloading
the container the CI-build will initiate a service update across an entire ECS cluster!

```yml
- docker build --build-arg NODE_ENV=production -t "$AWS_ECR_REPO:$CIRCLE_SHA1" .
```

The first command for a production build is one that might look familiar; building a production-environment-ready build
of the project, minus any dev-dependencies.

```yml
- eval $(aws ecr get-login)
- docker tag “$AWS_ECR_REPO:$CIRCLE_SHA1” “$AWS_ECR_URL/$AWS_ECR_REPO:master-${CIRCLE_SHA1:0:7}”
— docker push “$AWS_ECR_URL/$AWS_ECR_REPO:master-${CIRCLE_SHA1:0:7}”
```

Next the CI build logs into our EC2 Container Registry, add an appropriate *master* tag to the build, and push it up,
just like we do for staging builds.

```yml
- node scripts/production/deploy.js “master-${CIRCLE_SHA1:0:7}”
```

Following that, the CI build deploys to the cluster. This is done through AWS, and therefore the
[AWS JS SDK](http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/ECS.html), in a handy script that looks up the task
definitions for my project’s service, takes the latest one, replaces the image tag with the tag passed to it in
`circle.yml` and saves the new revision. Once that’s done it initiates a service update, passing it the latest task
revision ID, and ECS handles the rest!

---

Now, given everything in this article, builds take ages to complete in CircleCI. We’re talking roughly ten minutes per
commit 😩 Because nothing is cached. So speeding that up was extremely important, and here’s some steps I put in place
to help with that:

**(1)** Following a production deployment, we now push to a static “*latest*” tag like so:

```yml
- docker tag “$AWS_ECR_REPO:$CIRCLE_SHA1” “$AWS_ECR_URL/$AWS_ECR_REPO:latest”
— docker push “$AWS_ECR_URL/$AWS_ECR_REPO:latest”
```

And at the top of the dependencies we pull the “*latest*” tag onto the CI build:


```yml
- eval $(aws ecr get-login --region us-east-1)
- docker pull "$AWS_ECR_URL/$AWS_ECR_REPO:latest"
```

This caches all the layers required by Docker to build a production image, and (assuming) we deploy often this means
future builds will take significantly less time 😉

**(2)** Another step in the dependencies that took a significant amount of time was when docker was constantly pulling
the same version of mysql / redis every single time.
[CircleCI even hint at this in their documentation](https://circleci.com/docs/1.0/docker/#caching-docker-layers) — this
just takes a long time every time. So caching these is essential:

```yml
- >
  if [ -e ~/docker/mysql.tar ]; then docker load -i ~/docker/mysql.tar;
  else docker pull mysql:5.6.33 && docker save -o ~/docker/mysql.tar mysql:5.6.33; fi
- docker run --detach --name ci-mysql -p 127.0.0.1:13306:3306 --env MYSQL_ALLOW_EMPTY_PASSWORD=yes mysql:5.6.33
- >
  if [ -e ~/docker/redis.tar ]; then docker load -i ~/docker/redis.tar;
  else docker pull redis:3.0.7 && docker save -o ~/docker/redis.tar redis:3.0.7; fi
- docker run --detach --name ci-redis redis:3.0.7
```

Not forgetting to add the *~/docker* directory to CircleCI’s list of cached directories, otherwise nothing will be
cached and saving these images will be more time wasted!

```yml
dependencies:
  cache_directories:
    — "~/docker"
```

After implementing both of these, build times went down to 5–6 minutes. It still takes a while (especially when it’s
just a simple JSHint error 😩) but we’re getting there!

**(3)** If you’re still here reading this far chances are you’ve read this Docker guide on caching layers. By placing
specific build arguments in strategic points throughout the Dockerfile, I can break caching whenever I please:

```
FROM node:4.6.0

EXPOSE 3000

RUN apt-get update \
  && apt-get install --no-install-recommends -y \
    build-essential \
    gcc \
    make \
  && apt-get autoremove -y \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*
RUN npm install -g npm

ADD https://github.com/Yelp/dumb-init/releases/download/v1.1.1/dumb-init_1.1.1_amd64 /usr/local/bin/dumb-init
RUN chmod +x /usr/local/bin/dumb-init
RUN mkdir -p /var/app && chown node:node /var/app

USER node
WORKDIR /var/app

COPY package.json .
RUN npm install --production

ARG NODE_ENV
ENV NODE_ENV ${NODE_ENV:-development}
RUN if [ "$NODE_ENV" != "production" ]; then npm install --only=dev; fi

# Deliberate cache-buster here to ensure the files aren't cached in builds
ARG CACHE_BUST=not-if-this-is-omitted
COPY . .

RUN chown -R node:node /var/app
CMD [ "dumb-init", "npm", "start" ]
```

Each line starting with ARG represents a build argument, which can be used to
[break cached image layers](https://docs.docker.com/engine/reference/builder/), and for this Dockerfile the order at
which caching can be broken is:

- If `package.json` changes, the next line (`npm install --production`) will be broken (which is correct, if the list of
  installed modules change then the production dependencies should update too!)
- If the `NODE_ENV` build argument is set, which is essential for building production images.
- If the `CACHE_BUST` build argument is set, to anything, which is used to ensure the project files are copied into the
  Docker image every single time.

A handful of tips were taken
[from here](https://nodesource.com/blog/8-protips-to-start-killing-it-when-dockerizing-node-js/?utm_source=nodeweekly&utm_medium=email),
[and here](https://karthikv.net/articles/circleci-docker-flow/),
as well as ruthlessly crawling the [Docker docs](https://docs.docker.com/) & [CircleCI docs](https://circleci.com/docs/).

---

So, having written a deployment routine for a project using Docker, how do I feel about older projects for
*Car Throttle*? Well, I’d like to move them all to containers too. And excluding some (amazing) caching features
courtesy of Nginx, we could realistically move the entire stack over to ECS with little modifications to the software
architecture. I’m still working out how best to handle my development environment with Docker, and in the meantime I’ve
been tapping into the [power of logging through Docker](https://docs.docker.com/engine/admin/logging/overview/), passing
stdout directly to Fluentd (rather than having the application open additional TCP connections to a Fluentd service),
something I’ll discuss later.

That’s it from me for now. I hope you found this useful – I actually think writing it out has improved my understanding
of it! If you have any questions feel free to [tweet me](https://twitter.com/jdrydn). Thanks!
