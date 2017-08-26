---
layout: post
title: So, those Node Modules...
author: james
---

*If you follow the `nodejs` community, you may have recently heard about wide-spread issues the community encountered when
[a developer pulled his widely-used dependencies from the registry](https://medium.com/@azerbike/i-ve-just-liberated-my-modules-9045c06be67c).
Whilst this article is focused on how to decrease the time each staging deployment takes, it also happens to be why the
[Car Throttle](https://www.carthrottle.com) stack was unaffected.*

---

Over here at Car Throttle our web-stack is JavaScript-based. Both client and server. Which is totally awesome, by the
way. And we use [CircleCI](https://circleci.com), as our
[continuous integration](https://en.wikipedia.org/wiki/Continuous_integration) (CI) service, to package up our products
and deploy them to our production instances that are elegantly hosted on [Amazon Web Services](https://aws.amazon.com)
(AWS).

As clean as this deployment flow was, it took a long time to deploy to all the instances because of our dependencies.
If you don’t use `nodejs`, the `node_modules` folder holds any and all dependencies (both first-party and third-party)
that your Node application relies on. Some of these are purely Javascript based, so they’re a simple collection of
files, but some of the more complex modules use compiled scripts that require “building” on the host machine, which is
very time consuming and really slowed down our deployment process. There has been plenty of times where we only needed
to deploy a one-line fix and it took far longer than it needed to because of these compiled modules.

So at the moment, when we deploy, our CI creates a compressed archive of the application and any other necessary files,
includes its production dependencies without any of the compiled modules, and then uploads it to S3:

```sh
$ mkdir -p node-app-deploy/scripts
$ cp -r app node-app-deploy/
$ cp npm-shrinkwrap.json node-app-deploy/
$ cp package.json node-app-deploy/
$ cp -r scripts/production node-app-deploy/scripts
$ cd node-app-deploy
$ npm install --production --ignore-scripts
$ cd ..
$ tar -czf node-app-deploy.tar.gz node-app-deploy
$ node scripts/deployment/upload_archive_to_s3.js node-app-deploy.tar.gz deploys/node-app/node-app-deploy.tar.gz
```

Then the deployment script remotely logs into each instance and initiates the deploy script, which fetches the archive
we just uploaded to S3 and runs a command to start compiling the remaining modules for production:

```sh
$ npm rebuild && npm run-script postinstall
```

And this takes literally *forever*. Seriously, so much time spent just waiting for modules to compile. Maybe nine or ten
dependencies need to be compiled. Per instance. And at high load there could be six, seven or eight production instances
running.

[![House MD gif]({{ '/img/posts/2016-03-29-house-md.gif' | relative_url }})](https://giphy.com/gifs/hugh-laurie-house-md-gregory-tzcx8ZXNDcXwA/)

Now, we’re a fast-moving product team. If we don’t like how something works, then we change it until we do. It’s one of
the (*many*) reasons I enjoy working at here. So we have a problem with how long our internal deployment takes? Let’s
get on that.

We couldn’t just compile all the modules on our CI. I mean, technically we could, if we ran our own CI we would
(instinctively) run it on the same instance specification as our production instances, which means it would be extremely
easy to create a complete archive of our production products and simply deploy that archive. But we don’t run it
ourselves, so that’s not really an option. And for the time being, we’re not going to run it ourselves. It’s nice to
offload this task to a reliable 3rd-party service!

What we do have is **AWS**. With a programmatic API that allows us to perform any task that a user on AWS can do without
the need of a UI. Theoretically we could spin up an instance, of the same production specification that we are currently
using, make that compile all of our dependencies and prepare them as an archive for our deployment process.

As it turns out, this is pretty easy to do, since we use a [shrinkwrap](https://docs.npmjs.com/cli/shrinkwrap) to ensure
specific module versions are installed, so taking an MD5 hash of that file gives us a consistent identifier for this set
of dependencies, which only changes when we actually modify our dependencies. Perfect!

So we can take a hash of the shrinkwrap, and check to see if we have the corresponding modules for it:

```bash
HASH=$(node scripts/deploy/md5_file.js npm-shrinkwrap.json)
node scripts/deploy/file_exists.js "node-app-modules/$HASH.tar.gz"
if [ "$?" -ne "0" ]; then
  printf "==FAILED== Missing dependencies for production deployment at: node-app-modules/$HASH.tar.gz :(\n"
  exit 1
fi
```

Above is a simple BASH statement using two Javascript files (since CircleCI’s BASH install doesn’t have a native md5
script 😢) to see if a module archive exists in a specific S3 bucket. If the archive is not found, then the script emits
an error code of 1 and this script terminates our deployment.

Now, if the archive exists, then we pull the archive to the current directory, extract the `node_modules` folder within
and discard the archive, and continue with our deployment as expected, with the modules completely intact and ready for
our production environments, no `npm rebuild` necessary.

When the archive doesn’t exist, the deployment fails. As it should. It means we haven’t kept an eye on our dependencies
and didn’t create a new archive. Human error. Our bad! So how should we create a new archive?

Well, as discussed earlier, we can’t use our CI. And we can’t use our dev machines, they’re not the same build as our
production instances. So instead we have to boot an instance every time we need to build new set of dependencies.

Thankfully, AWS have a [JavaScript API SDK](http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html) making this
super easy to do:

```js
var EC2 = new AWS.EC2({
  accessKeyId: 'some-IAM-user-key',
  secretAccessKey: 'some-IAM-user-secret',
  region: 'us-east-1'
});
EC2.runInstances({
  ImageId: 'some-AMI-image-of-your-choice',
  InstanceType: 't2.small',
  KeyName: 'some-AWS-key-of-your-choice', // For some-AWS-key-of-your-choice.pem 😉
  MaxCount: 1,
  MinCount: 1,
  Monitoring: { Enabled: true },
  SecurityGroupIds: [ 'sg-8b91f1dpe' ], // Whatever security groups you need
  UserData: new Buffer([
    '#!/bin/bash',
    'cd ~/scripts',
    'git pull && npm install',
    'node bin/modules-bundler.js --f --project node-app',
    'shutdown -h now "Modules completed, so shutting down"'
  ].join('\n')).toString('base64'),
}, function (err, data) {
  if (err) return callback(err);

  NEW_INSTANCE_ID = data.Instances[0].InstanceId;
  console.log('New AMI instance created with ID: ' + NEW_INSTANCE_ID);
  callback();
});
```

Whilst it’s booting, we can quickly attach a name to this instance, so we can easily identify it in the EC2 Management
Interface:

```js
EC2.createTags({
  Resources: [ NEW_INSTANCE_ID ],
  Tags: [ { Key: 'Name', Value: 'modules-bundler' } ],
}, callback);
```

And finally set the instance to terminate once it’s shutdown, so we’re not being billed additional hours for a machine
we’re not using:

```js
EC2.modifyInstanceAttribute({
  InstanceId: NEW_INSTANCE_ID,
  InstanceInitiatedShutdownBehavior: { Value: 'terminate' }
}, callback);
```

This means that we have an archive with our compiled modules intact, which makes deploying our project really fast
(compared to building the modules each time!) and it means our production apps are unaffected by the rest of the NPM
community (until such a time we need to update our modules, then we have to spend time fixing everything!)!

I’m not going to go into line-by-line details on how the module bundler works but the basic thought-process is:

- Fetch the `package.json` and `npm-shrinkwrap.json` files for the project in question using the
  [GitHub Contents API](https://developer.github.com/v3/repos/contents/#get-contents), otherwise we’d have to get
  SSH-keys per-project onto this instance, and that’s something I'd like to avoid!
- Store a `md5` hash of the npm-shrinkwrap.json file.
- Run `npm install --production` to fetch all the production dependencies, and run any scripts associated with any of
  the dependencies.
- Compress the `node_modules` folder into an archive.
- Upload the archive to S3 to a known location for the other scripts to pull from.

I 💗 Slack, and we live in Slack over at Car Throttle, so my module-bundler script also push messages before and after
so we’re aware that the module-bundler has finished (and then usually we retry our builds in CircleCI to complete the
deployment)!

Overall, this was a very rewarding implementation. It now takes five minutes to deploy to three servers instead of
fifteen so I’m definitely happy with this! I also had to research the AWS JS SDK and work out how to bend that to my
will, which didn’t take too long, and I find myself wanting to push all our devops stuff into testable JavaScript
functions rather than (untestable) BASH scripts.. this could get interesting!

---

**Update #1:** Hearing news about [a developer pulling all his modules from NPM](https://medium.com/@azerbike/i-ve-just-liberated-my-modules-9045c06be67c),
including some widely-depended-on modules, from NPM breaking a huge number of builds makes me grateful for this
deployment method. This would have broken our builds if we had deployed in the time between this guy pulling all the
dependencies and other people taking ownership and filling in with forks of the originals. Bravo!

**Update #2:** Hearing more news about NPM vulnerabilities & worms being injected into machines using bad NPM packages
& scripts [as mentioned by NPM in their own blog](http://blog.npmjs.org/post/141702881055/package-install-scripts-vulnerability),
that’s another reason why archiving dependencies like this is awesome!

**Update #3:** Of course, using [Docker](https://www.docker.com) and caching module archives in a Docker image layer
makes this entirely obselete 🤷‍♂️
