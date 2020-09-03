---
title: AWS CloudWatch Logs
---

In a world dominated by containers & microservices over servers & monoliths, it’s important to get your application logs sorted. Here’s a brief overview of iterations of application log stacks in production-level applications at [Car Throttle](https://www.carthrottle.com/).

<!--more-->

---

So, since we’re going to be discussing application logs, it’ll help to visualise this. So here is an example HTTP request, response & application log when I ran a `GET` request to fetch embed data from a locally running [Yoem](https://npm.im/yoem) instance for [a YouTube video](https://www.youtube.com/watch?v=r-3NO8HRazc):

```
GET /?url=https://www.youtube.com/watch?v=r-3NO8HRazc HTTP/1.1
Accept: */*
Accept-Encoding: gzip, deflate
Connection: keep-alive
Host: localhost:3010
User-Agent: HTTPie/0.9.2
```

```
HTTP/1.1 200 OK
Connection: keep-alive
Content-Length: 607
Content-Type: application/json; charset=utf-8
Date: Mon, 28 Aug 2017 19:54:09 GMT
ETag: W/"25f-uQSxnpLwb78c5uYXtbzhTWyz1Qg"
Vary: Origin
X-Response-Time: 425ms
{
  "type": "video",
  "version": "1.0",
  "title": "Quantum Break All Cutscenes Movie (Game Movie) FULL STORY",
  "thumbnail_url": "https://i.ytimg.com/vi/r-3NO8HRazc/hqdefault.jpg",
  "thumbnail_height": 360,
  "width": 480,
  "author_url": "https://www.youtube.com/user/RabidRetrospectGames",
  "author_name": "RabidRetrospectGames",
  "height": 270,
  "provider_url": "https://www.youtube.com/",
  "provider_name": "YouTube",
  "html": "<iframe width=\"480\" height=\"270\" src=\"https://www.youtube.com/embed/r-3NO8HRazc?feature=oembed\" frameborder=\"0\" allowfullscreen></iframe>",
  "thumbnail_width": 480,
  "fetch_date": "Mon, 28 Aug 2017 19:44:58 GMT"
}
```

```json
{
  "timestamp": "2017-08-28T19:54:09.924Z",
  "type": "req",
  "req": {
		"method": "GET",
    "url": "/?url=https://www.youtube.com/watch?v=r-3NO8HRazc",
    "headers": {
      "accept": "*/*",
      "accept-encoding": "gzip, deflate",
			"host": "localhost:3010",
      "user-agent": "HTTPie/0.9.2"
    },
    "path": "/",
    "query": {
      "url": "https://www.youtube.com/watch?v=r-3NO8HRazc"
    },
    "body": {}
  },
  "res": {
    "statusCode": 200,
    "headers": {
      "content-length": "607",
      "content-type": "application/json; charset=utf-8",
      "etag": "W/\"25f-uQSxnpLwb78c5uYXtbzhTWyz1Qg\"",
      "vary": "Origin",
      "x-response-time": "425ms"
    },
    "yoem": {
      "fetch_date": "Mon, 28 Aug 2017 19:54:09 GMT",
      "ms": "425ms",
      "ms_ms": 425,
      "service_name": "YouTube",
      "url": "https://www.youtube.com/watch?v=r-3NO8HRazc",
      "url_parsed": {
        "protocol": "https:",
        "slashes": true,
        "auth": null,
        "host": "www.youtube.com",
        "port": null,
        "hostname": "youtube.com",
        "hash": null,
        "search": "?v=r-3NO8HRazc",
        "query": "v=r-3NO8HRazc",
        "pathname": "/watch",
        "path": "/watch?v=r-3NO8HRazc",
        "href": "https://www.youtube.com/watch?v=r-3NO8HRazc"
      }
    }
  }
}
```

## Application to Fluentd

For the longest time at [Car Throttle](https://www.carthrottle.com/) we’ve used a combination of different technology to ship application logs. At first the main production stack used a combination of `[bunyan](https://npm.im/bunyan)` and monkey-patching the main functions to send log data to an always-running `[fluentd](https://www.fluentd.org/)` instance using `[fluentd-logger](https://www.npmjs.com/package/fluent-logger)`.

From there the `fluentd` instance takes logs in via `[in_tcp](https://docs.fluentd.org/v0.12/articles/in_tcp)` and outputs to `[out_s3](https://docs.fluentd.org/v0.12/articles/out_s3)` & `[fluentd-plugin-elasticsearch](https://github.com/uken/fluent-plugin-elasticsearch)`. S3 provides a perfect archive of log data, and [Elasticsearch](https://aws.amazon.com/elasticsearch-service/) stores the last 30 days of data for (near) real-time analysis & trends.

This pattern worked well, to a degree. Logs found their way into the [Kibana](https://www.elastic.co/products/kibana) dashboard quickly, although being based on Elasticsearch there were a few teething issues, (e.g. entire records occasionally being logst due to slightly differing (“malformed”) data) which often knocked the entire ES cluster into a “*yellow*” state, which caused plenty of devops headaches.

## Docker to Fluentd

When we started deploying services with Docker, we noticed Docker supported fluentd [as a logging driver](https://docs.docker.com/engine/admin/logging/fluentd/), so suddenly our services don’t need to use up additional processing power to send logs directly to `fluentd`, they just need to output logs in a specific format to `stdout`:

```
["yoem.req",1503950049.000,{"req":{"method":"GET","url":"/","...":"..."},"res":{"statusCode":200,"...":"..."}}]
```

To ease this, I wrote `[chill-logger](https://github.com/car-throttle/chill-logger)`, which allows our services to send JSON-stringified logs `stdout`, which [ECS](https://aws.amazon.com/ecs) can direct to `fluentd`, but it requires two additions to a standard `fluentd` instance and an update to your container configuration.

```ruby
require 'json'

module Fluent
  class DockerLogsFilter < Fluent::Output
    Fluent::Plugin.register_output('docker_format_logs', self)

    def emit(tag, es, chain)
      chain.next
      es.each do |time, record|
        app_record = JSON.parse(record['log'])
        router.emit(app_record[0], time, app_record[2])
      end
    end
  end
end
```

Firstly, a [custom `fluentd` filter](https://docs.fluentd.org/v0.12/articles/filter-plugin-overview) to take logs output by Docker and transform them into native `fluentd` events.

```xml
<match docker.**>
  @type docker_format_logs
</match>
```

Enable the filter in your `td-agent.conf` file like above. Docker sends events with the tag `docker.${INSTANCE_ID}`, which realistically won’t be known at runtime, so the custom filter will capture all Docker events and re-emit them as native events that `fluentd` prefers.

```bash
$ docker run ... \
  --log-driver=fluentd \
  --log-opt fluentd-address=myfluentdhost:24224
```

Finally, update your container options (either via the ECS task definitions role or via the `docker` cli) to send the logs to the `fluentd` instance.

But again, this would then ship logs to Fluentd and back out into S3 & Elasticsearch, with the same dashboard that we know and love but also the same constraints as we know and love 🤦 This was a good middle-ground for application logs from these new microservices but more was required.

## Docker to AWS Cloudwatch Logs

After a little digging into logging platforms I noticed a platform hiding right under my nose: **Cloudwatch Logs**. Having written autoscaling rules for [EC2 instances](https://aws.amazon.com/ec2) & [lambda scripts](https://aws.amazon.com/lambda) I knew Cloudwatch Logs existed, and indeed was tracking & reacting to server/service metrics I had set up in the past. What took me a while to notice was [Docker support for `awslogs`](https://docs.docker.com/engine/admin/logging/awslogs/), so after a little testing (with Yoem, mentioned above) it turns out Cloudwatch Logs is exactly what I was looking for!

Cloudwatch Logs takes those JSON logs (looking exactly like that log data at the top of this page) and inserts them into a specified log-group, then the data can be queried in a similar fashion to ES. By “*similar fashion*” I mean a similar query search, but if data isn’t found or a record doesn’t match the type the query is suggesting, the record returns `false` and naturally isn’t found by the query.

```bash
$ docker run ... \
	--log-driver=awslogs \
	--log-opt awslogs-region=us-east-1 \
	--log-opt awslogs-group=my-project/awesome-service
```

The only configuration that’s required for this is creating the log-group in Cloudwatch Logs, and then updating your container options to send logs via the `awslogs` driver. And that’s literally it. Suddenly you have all log data going into Cloudwatch Logs, complete with search options, the only thing you’re missing is those lovely Kibana dashboards & aggregations. Which I’m slowly getting used to. I also set the log-group retention policy to 3 months, so Cloudwatch Logs will automagically remove logs older than 3 months, which realistically is plenty of time to store application logs for 🙌

Here’s where Cloudwatch Logs starts to get a little more interesting. The service support subscriptions, as discussed in **[Real-time processing of log data with Subscriptions](http://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/Subscriptions.html)**.

This effectively means you can ship important data from Cloudwatch Logs to other AWS services. And Amazon even streamline the process for one particular use case: **Streaming Cloudwatch logs to an AWS ES instance**. So if you love your Kibana dashboard & aggregations more than I do then you can still use Elasticsearch, but instead of `fluentd` & S3 you can use Cloudwatch for the permanent store (or semi-permanent if you have a retention policy enabled) [but still use ES & Kibana](http://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_ES_Stream.html). I don’t know how likely I am to use that, given that Cloudwatch Logs supports (excellent) filtering & pattern searching, but it’s nice to options open to me for when my logging use case changes!

---

So, this post has gone over the different forms of application logging used in production-level applications here at [Car Throttle](https://www.carthrottle.com/). The first focused on emitting logs in the application, and the second two focused on using the underlying architecture to ship logs, so the application doesn’t have to focus on logging. I much prefer this way of thinking - it means I can focus building services that focus on solving their problem. Obviously on a per-project basis I have to create log streams in Cloudwatch Logs or update my `td-agent.conf` to support new services - no solution is without setup - but the fact that Cloudwatch Logs handles records individually rather than part of a collection is much more appealing to me.

Next step is to add [`fluent-plugin-cloudwatch-logs`](https://github.com/ryotarai/fluent-plugin-cloudwatch-logs) to the existing `fluentd` instance and slowly start to move logs from ES to Cloudwatch Logs. Services backed by Docker & ECS can be moved over anytime - they require a simple configuration change & deployment - but older services still using `fluentd` have higher volumes of traffic than these microservices, so I’ll be migrating them slowly!

Interesting thought whilst writing this: Elasticsearch isn’t truly “*schema-less*”. It is, in the sense that [new properties can be added on the fly](https://www.elastic.co/blog/found-elasticsearch-mapping-introduction#when-to-specify-a-custom-mapping), but what they don’t openly tell you is the type of every subsequent property has to be the same type, otherwise it just causes massive issues. Whereas Cloudwatch Logs are truly schema-less - it just depends on the query you’re searching with. Key equals string? Search where that key is a string. Key is less than a number? Search where that key is a number.
