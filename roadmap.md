		"tslib": "2.4.0",
		"typescript": "4.7.4"
	},
	"dependencies": {
		"@extractus/article-extractor": "^8.0.10",
		"@extractus/feed-extractor": "^7.1.3",
		"entities": "^4.5.0"


      (from https://github.com/WetHat/rss-tracker/blob/master/package.json)


[Full Content RSS Feeds Generator](https://fullcontentrss.com/)


[samuelclay/NewsBlur: NewsBlur is a personal news reader that brings people together to talk about the world. A new sound of an old instrument.](https://github.com/samuelclay/NewsBlur)

[2minutes du peuple - Icedrive](https://icedrive.net/dashboard/#/cloud/Zm9sZGVyLTUzMzkyMjIw)

[Tiny Tiny RSS](https://tt-rss.org/)

[rbren/rss-parser: A lightweight RSS parser, for Node and the browser](https://github.com/rbren/rss-parser)


[How Stream Built a Modern RSS Reader With JavaScript - Stream Tech Stack](https://stackshare.io/stream/how-stream-built-a-modern-rss-reader-with-javascript)
How Stream Built a Modern RSS Reader With JavaScript
By 
Stream
13,647
14
By Nick Parsons, Sr. Developer Advocate, Stream

Winds 2.0 by Stream



Winds started out as a simple example app for Stream, but thanks to an outpouring of support from our awesome community we decided to focus more time and energy on the project. The initial response around Winds 2.0 has exceeded all of our expectations. Since launching in mid-May the application ranked #1 on Hacker News for over a day, has 5,200 stars (and counting) on GitHub and became a trending app on Product Hunt.

Going into it, there was no way to anticipate how popular Winds 2.0 would become - would it be an absolute hit or an epic failure and waste of time?? The team enjoys building example apps so I knew it wouldn’t be a total loss, and it’s been rewarding to see this new iteration being used so extensively in the first month after release.

The tech stack for Winds is completely different from that of Stream. You may have seen the blogpost that StackShare wrote about how Stream powers the activity feeds for 300 million users using Go, RocksDB and Raft. Winds, however, is based on Node.js, MongoDB Atlas, Express, PM2, Bull, Babel and React.

To get started with Winds 2.0, you can try the web version or download the application here, or if you feel more adventurous head over to GitHub and spin it up locally. Next up, let’s talk a little bit about the Winds 2.0 stack and why we chose to go with the technologies we did (and why we chose to build Winds in the first place!).



RSS is a Broken Experience 😭
We realize that many RSS power users are developers, designers and journalists. One of our goals with Winds is to answer the questions we had been asking ourselves: What if a community of developers and designers could create an RSS experience that’s simplistic and polished? Could this reverse the downward spiral of less users taking advantage of the technology and more publications dropping support?

The future of RSS is uncertain at best. Our hope with this project is to make a contribution to #ReviveRSS.



Why JavaScript/Node…? 🤔
Another core goal for Winds is to enable a wide range of developers to contribute. We want it to be easy for anyone to be able to notice something they don’t like about their RSS/Podcast experience and easily submit a pull request with a fix or addition.

If you were brave enough to explore the codebase, you probably noticed that we’re using JavaScript for everything – both front and backend. Most of our team is experienced with Go and Python, so Node was not an obvious choice for this example app. What’s funny about JavaScript is how many people complain about it being an inadequate language. Sure, it has its quirks – single threaded, callback hell, etc.– but we believe that it’s possible to build great software in any language.

For Winds, JavaScript has been a great choice to foster a community around the project. More importantly, JavaScript’s maturity has started to shine with the added support of the Async/Await syntax.

Sure... there will be haters who refuse to acknowledge that there is anything remotely positive about JavaScript (there are even rants on Hacker News about Node.js.); however, without writing completely in JavaScript, we would not have seen the results we did. Here’s a quick breakdown of some of the reasons why we chose JavaScript:

Nearly every developer knows or can, at the very least, read JavaScript
With ES6 and Node.js v10.x.x, it’s become a very capable language
Async/Await is powerful and easy to use (Async/Await vs Promises)
Babel allows us to experiment with next-generation JavaScript (features that are not in the official JavaScript spec yet)
Yarn allows us to consistently install packages quickly (and is filled with tons of new tricks)


DevOps 🖥️
It’s rare that you hear about how a company deploys and manages code. Being that Winds 2.0 is open-source, we wanted to share a few of the tools we use to get the job done when it comes to getting our code from our machines up to the server.

The web version of Winds is statically hosted on S3 with CloudFront. In all, it costs us a few dollars a month to host. Every desktop version of the application is deployed inside of Electron, allowing us to bridge the gap between web and desktop.

As for the back-end API, that’s another story. We have a rather decent deploy flow going on to ensure stability and maintainability. Here’s the rundown:

All code is stored on GitHub
We manually kick off builds on AWS using a combination of Fabric and Boto
CloudFormation create a fresh Winds environment consisting of EC2 instances, Auto Scaling Groups (ASG), Application Load Balancer (ELB), and a Redis instance
AWS CCM stores and retrieves the various configurations required at boot (e.g. current version, etc.)
Dotenv & Environment variables are stored in Puppet and CCM
Once all EC2 instances are available, a Puppet script runs and applies the configuration on all live instances (in apply mode)
PM2 boots, automatically starting the various Node.js processes we need to keep our application alive (API and Workers)
For logging metrics, we use a combination of StatsD + Graphite + Grafana.



Winds 2.0 by Stream



Understanding Electron ⚡
We wanted to experiment with building an Electron app with downloads for every Linux distro, macOS, and Windows, in addition to the web. Fundamentally, this seemed pretty easy: we write code, wrap it in an Electron shell, and release to our desired operating system… It turns out we were wrong.

Electron, though powerful, turned out to be a bigger beast than we had anticipated. Building to different distros was especially hard, even with electron-builder (granted, we had the bad luck of needing to patch electron-builder (and that bug has since been fixed), but that only accounted for some of the pain points we hit). The macOS menu bar had to be just right for the macOS store to accept our app, and performing small tasks with the Electron API, like opening a link in an external browser, turned out to be pretty difficult. Despite the difficulties, our team moved forward with some custom tooling (all visible and open-sourced on GitHub) and we released not only to all of our release targets but to the web, too.



Testing in JavaScript 🗳️
JavaScript is still the wild west to a degree. It’s rather un-opinionated, especially if you’re using Express, so we had to roll our own testing framework to get the job done. Our API, which is built with Express, uses a combination of various Node.js modules. Here’s a list of the tools we use for testing:

Mocha as a testing framework
Chai as an assertion library
Sinon as our mocking library
Nock as the HTTP mocking library
mock-require as a module mocking library
Istanbul as our test coverage tool
Bonus: Here’s an actual example of our test runner.

The combination of test modules we chose our team to move fast with multiple developers working on various feature sets at the same time, without bringing down the API.



Front End 🛠️
React is a phenomenal framework, and in our opinion, has won the battle against other frameworks such as Angular and Ember. Given its updated MIT license, it’s perfect for the Winds 2.0 project.

The main stack that we use for Winds 2.0 is pretty straightforward:

Main Stack
Create-react-app
React
Redux
React-router
Electron
Now let’s look at some of the front-end modules we used to make Winds 2.0 a reality:

Interesting Modules
React-audio-player is a nice React interface to the core audio element API
React-waypoint for scrolling events to handle automatic pagination
React-dropzone for easy OPML file imports
React-image for flawless image fallbacks in the event we don’t have an image stored


Back End 🛠️
When you’re building a large application, you generally rely on many libraries and tools to increase the code quality, time to market, etc. With that said, Winds too relies on many libraries and tools. Below are several, but not all, that we use:

FeedParser
FeedParser is a rather complex Node.js module that in our opinion, is the backbone of the project. It handles most of the inconsistencies found in RSS feeds and spits out a “cleansed” version of the feed. Without this module, we would be writing a lot of if/else statements… and that’s no fun.

Franc-Min
Franc-Min is a language detection module that we utilize for determining the language of a feed. This might sound like a small task; however, it’s in fact, a large part of our personalization engine. For example, we only recommend feeds in English to users who speak English. Same with other languages.

Bull
Bull helps keep the Winds 2.0 queue structurally sound with the help of Redis. It comes with a super easy API and supports multiple queues, which is a perfect fit for our use-case. Additionally, there are several open-source monitoring tools on their GitHub page that provide insight into what is happening behind the scenes.

ES6
JavaScript w/ ES6 enables our team to write minimalist code for a wide range of people. All of the code in Winds 2.0 is 100% JavaScript (with the exception of a handful of bash scripts to help with deploy workflows). The team is currently migrating much of the functionality in the codebase to utilize Async/Await to reduce the number of lines of code.

Yarn
Yarn is absolutely amazing. It’s an incredibly fast package manager built specifically for JavaScript. On top of that, it’s 100% open-source and nearly always available, due to it’s caching mechanisms. We’ve used npm in the past, and although it works just fine, the team here at Stream prefers Yarn.

Axios
Axios is a Promise based HTTP client for the browser and Node.js. We actually use it on both the front and back-end for various tasks. For example, all front-end HTTP requests flow through a wrapper to Axios. And for the back-end, we utilize Axios to inspect the size of the file prior to sending them through the parsing process and then off to the database for storage – this ensures large files don’t bring down our worker processes. If you haven’t checked out Axios, you definitely should.

Commander
Commander is another Node.js module, this time providing full support for building command-line interfaces. Yes, that’s right, Winds has a CLI that we use for various tasks such as testing feeds, dropping RSS feeds, and more!

Babel
Babel “allows us to use the next generation of JavaScript, today”. Essentially, if a feature, such as imports isn’t available in a particular JavaScript (front-end and/or back-end), we can still use it by leveraging Babel.

Express
Express is used to power our API. Compared to other frameworks out there, it truly shines when under stress. Honestly speaking, our team has experience with most, if not all, of the JavaScript frameworks and we find Express to be the easiest to work with. It’s regularly maintained, has open-source components, and it’s awesome. 😎

Sentry
Sentry allows for real-time crash reporting for our back- and front-end. What blows us away is how granular you can get with Sentry. Their features help us identify and debug errors and give us insight on when to fix or rollback. When it comes to firefighting, this tool definitely wins the market.

Algolia
Algolia provides lightning-fast (literally) search for our application. In under 2ms, our users can discover RSS feeds and podcasts to read or listen to. They even have components for frameworks such as React and Angular to make the integration better. This is by far one of our favorite; however, we like them all. 😛

Stream
Stream is a key resource to Winds 2.0, as it provides news feeds and activity streams for our users and even machine learning-based personalization. Without Stream, we would not be able to serve up suggested content to our users as we currently do.

MongoDB Atlas
MongoDB Atlas is a phenomenal DBaaS, allowing us to worry about acquiring users, while MongoDB worries about uptime. It’s identical to hosting your own cluster, except MongoDB provides you with a dashboard and a URI to connect to. With MongoDB Atlas, there’s no more worrying about cluster health, monitoring, etc.

Mongoose
Mongoose is a powerful ODM that allows us to define rich models within our MongoDB environment. Generally speaking, NoSQL databases are schemaless (meaning they have or require no form); however, with MongoDB, it’s always a good idea to specify a schema so you can index and organize your data properly. This allows for easy updates and efficient queries.

PM2
PM2 is a Node.js process manager. It allows us to ensure uptime, and scale processes as we need. The CLI for the project is dead simple, which allowed our team to pick it up on the fly.



Final Thoughts 😁
To get started with Winds 2.0, you can try the web version or download the application here. If you’re feeling more adventurous head over to GitHub and spin it up locally.

RSS is in a vicious circle. Winds is a community effort to help turn the tide and #ReviveRSS. Contributions are always much appreciated. To discuss new features check out the official Slack channel for Winds.

If you’re curious to know a little more about Stream and how our API works, we have an easy 5-minute API tour that will walk you through the process of building scalable activity feeds.