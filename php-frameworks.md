---
layout: default
---

[&laquo; Back](./)

Having used a few PHP frameworks, such as CodeIgniter and Kohana, I decided to expand on my knowledge of PHP and write some frameworks myself!

---

## Exp0

[github.com/jdrydn/exp0](http://github.com/jdrydn/exp0)

**Exp0** was my first framework, built to merge a gap between Model-View-Controller frameworks and standard PHP files.

The idea behind this was simple, take a regular PHP file but allow it to access a global `$exp0` variable, which allows you to load modules & models.

This came about because I loved the structure behind model-view-controller frameworks like [CodeIgniter][codeigniter] but I loved the freedom on generic PHP files and I adored the unlimited freedom that came with them.

Here is an example of a page on Exp0, pulling in a library and pulling in other HTML too.

{% highlight php %}
<?php
	$exp0->load->view('header',array(
		'activeNav' => 'index',
		'title'=>'Welcome to exp0!'
	));
	$exp0->load->library('markdown');
?>
				<div class="page-header">
					<h1>Welcome to exp0 <small>We're rebooting the world. Watch out!</small></h1>
				</div>
				<div class="row">
					<div class="span10">
						<?php echo $exp0->markdown->get('index.main');?>
					</div>
					<div class="span4">
						<?php echo $exp0->markdown->get('docs.list');?>
					</div>
				</div>
<?php
	$exp0->load->view('footer');
?>
{% endhighlight %}

###### Exp0 was written in 2011 and is no longer in development or production.

---

## Leaf

[github.com/jdrydn/leaf](http://github.com/jdrydn/leaf)

**Leaf** was written to be more of a model-view-controller framework, looking more like [Kohana][kohana] rather than CodeIgniter.

It is a more formal framework, designed to be more lightweight than something like Kohana, but still provide all the great features and support that a framework should provide.

You'll find the structure and templating is similar to Kohana, since it was built in mind to replace Kohana (but keep as many, if possible, of the framework features and classes).

###### Leaf was written in 2012 / 2013 and is no longer in development (and as far as I'm aware, not in production).

---

## Robin

[github.com/jdrydn/robin](http://github.com/jdrydn/robin)

Robin is my latest framework, building again upon the model-view-controller architecture but this time without the masses and masses of folder structure to define the framework. It's based more around simplicity, fewer files, and some nice features thrown in.

My favourite feature has to be the JSON routing, making the routing extremely simple and straightforward.

{% highlight json %}
[
	{
		"name" : "home",
		"path" : "/",
		"controller" : "Controller_Welcome"
	}
]
{% endhighlight %}

This can be expanded to support more complex routes, including params and automated testing, like so:

{% highlight json %}
[
	{
		"name" : "individual-line",
		"path" : "/of/(.[^/]+)/I/would/(.[^/]+)",
		"params" : [ "company", "id" ],
		"controller" : "Controller_Lines",
		"method" : "individual",
		"test" : {
			"path" : "/of/microsoft/I/would/123",
			"results" :
			{
				"company" : "microsoft",
				"id" : 123
			}
		}
	},
	{
		"name" : "company-lines",
		"path" : "/of/(.[^/]+)",
		"params" : [ "company" ],
		"controller" : "Controller_Lines",
		"method" : "company",
		"test" : {
			"path" : "/of/microsoft",
			"results" :
			{
				"company" : "microsoft"
			}
		}
	},
	{
		"name" : "about",
		"path" : "/about",
		"controller" : "Controller_Static",
		"method" : "about"
	},
	{
		"name" : "home",
		"path" : "/",
		"controller" : "Controller_Home",
		"method" : "index"
	}
]
{% endhighlight %}

Ridiculously easy! And the inbuilt tests aren't run on every request, just adding the relevant query string to trigger the tests!

I also liked this because all the framework files are stored in `private/robin`, making the constructors for framework files `new Robin_Request`. It keeps everything all tidy and tucked away, without the need for horrible `system` folders.

---

## And the rest

I don't always use frameworks. Often I take bits and pieces from various frameworks I've built to use in projects. For example, I wrote a `Router` class for `homefarmwensleydales` that I really quite liked, so I pulled it into a PHP project I'm developing at work!

(This is pretty much why I love object-oriented PHP, something I might write a blog post on later!)

[codeigniter]: http://codeigniter.com
[kohana]: http://kohanaframework.org