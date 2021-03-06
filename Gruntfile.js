module.exports = function (grunt) {

	require("time-grunt")(grunt);
	require("load-grunt-tasks")(grunt);

	var VERSION = require("./package.json").version,
		BANNER = require("fs").readFileSync("src/notice.txt").toString();

	grunt.initConfig({
		"clean": {
			"all": [ "dist/**" ]
		},
		"copy": {
			"bookmarklet-js": {
				"src": [ "src/HTML5OutlineBookmarklet.js" ],
				"dest": "dist/debug/HTML5OutlineBookmarklet.debug.js"
			}
		},
		"concat": {
			"outliner-js": {
				"src": [
					"src/notice.txt",
					"src/_head.js",
					"src/Section.js",
					"src/Outline.js",
					"src/walk.js",
					"src/enterNode.js",
					"src/exitNode.js",
					"src/func.js",
					"src/HTML5Outline.js",
					"src/_foot.js"
				],
				"dest": "dist/debug/outliner.debug.js"
			}
		},
		"uglify": {
			"bookmarklet-js": {
				"src": [ "dist/debug/HTML5OutlineBookmarklet.debug.js" ],
				"dest": "dist/debug/HTML5OutlineBookmarklet.min.js"
			},
			"outliner-js": {
				"options": {
					"banner": BANNER
				},
				"src": [ "dist/debug/outliner.debug.js" ],
				"dest": "dist/outliner.min.js"
			}
		},
		"gh-pages": {
			"dist": {
				"options": { "base": "dist" },
				"src": [
					"outliner.min.js",
					"outliner.html"
				]
			}
		},
		watch: {
			autoBuild: {
				files: [ "src/**" ],
				tasks: [ "test" ]
			},
			autoTest: {
				files: [ "test/**" ],
				tasks: [ "buster:local:test", "buster:jsdom:test" ]
			}
		},
		buster: {
			local: {
				options: {
					reporter: "specification",
					group: "h5o-browser"
				}
			},
			jsdom: {
				options: {
					reporter: "specification",
					group: "h5o-jsdom"
				}
			}
		},
		open: {
			"capture-browser": {
				path: "http://127.0.0.1:1111/capture"
			}
		},
		"saucelabs-custom": {
			dist: {
				options: {
					testname: "HTML5 outliner",
					build: process.env.TRAVIS_JOB_ID || "",
					browsers: [
						{ browserName: "internet explorer", platform: "Windows 8.1", version: "11" },
						{ browserName: "internet explorer", platform: "Windows 7", version: "11" },
						{ browserName: "internet explorer", platform: "Windows 7", version: "10" },
						{ browserName: "internet explorer", platform: "Windows 7", version: "9" },
						{ browserName: "internet explorer", platform: "Windows XP", version: "8" },
						{ browserName: "internet explorer", platform: "Windows XP", version: "6" },
						{ browserName: "firefox", platform: "Windows 8.1", version: "30" },
						{ browserName: "firefox", platform: "Windows 7", version: "30" },
						{ browserName: "firefox", platform: "OS X 10.9", version: "30" },
						{ browserName: "firefox", platform: "Linux", version: "30" },
						{ browserName: "chrome", platform: "Windows 8.1", version: "35" },
						{ browserName: "chrome", platform: "Windows 7", version: "35" },
						{ browserName: "chrome", platform: "OS X 10.9", version: "35" },
						{ browserName: "chrome", platform: "Linux", version: "35" },
						{ browserName: "safari", platform: "OS X 10.9" }
					],
					urls: [
						"http://127.0.0.1:8000/?reporter=sauce"
					]
				}
			}
		}
	});

	grunt.renameTask("release", "_release");

	grunt.registerTask("default", "Clean build and minify", [ "clean:all", "concat:outliner-js", "copy:bookmarklet-js", "uglify", "_bookmarklet-release" ]);
	grunt.registerTask("test", "Clean build, minify and run tests", [ "default", process.env.SAUCE_USERNAME ? "test-sauce" : "test-local", "test-jsdom" ]);
	grunt.registerTask("test-sauce", [ "buster-static", "saucelabs-custom" ]);
	grunt.registerTask("test-local", [ "buster:local:server", "open:capture-browser", "buster:local:test" ]);
	grunt.registerTask("test-jsdom", [ "buster:jsdom:test" ]);
	grunt.registerTask("start-dev", [ "buster:local:server", "open:capture-browser", "watch" ]);

	grunt.registerTask("release", function () {
		var bump = grunt.option("bump");
		if (bump != "patch" && bump != "minor" && bump != "major") grunt.fail.fatal("Please pass --bump");
		grunt.task.run(["_release:" + bump, "gh-pages"]);
	});

	grunt.registerTask("_bookmarklet-release", "Prepare bookmarklet HTML for release", function () {
		var done = this.async();
		var fs = require("fs"),
			ejs = require("ejs");

		ejs.renderFile("src/bookmarklet.html.ejs", {

			version: VERSION,
			banner: BANNER,
			bookmarklet: encodeURIComponent(fs.readFileSync("dist/debug/HTML5OutlineBookmarklet.min.js").toString()),
			outliner: encodeURIComponent(fs.readFileSync("dist/outliner.min.js").toString())

		}, function (err, bookmarklet) {
			if (err) grunt.fail.fatal(err);
			fs.writeFile("dist/outliner.html", bookmarklet, done);
		});

	});

	grunt.registerTask("buster-static", function () {
		// @todo: move buster-static task to grunt-buster package
		var done = this.async();

		var resolveBin = require("resolve-bin"),
			cp = require("child_process");

		resolveBin("buster", { executable: "buster-static" }, function (e, busterStaticBinPath) {
			if (e) {
				grunt.fail.fatal(e);
				return;
			}
			grunt.log.writeln("Spawning " + busterStaticBinPath + " --port 8000");
			var busterStaticProcess = cp.spawn(process.execPath, [ busterStaticBinPath, "--port", "8000" ], {
				env: process.env,
				setsid: true
			});
			busterStaticProcess.stdout.once("data", function () {
				done();
			});
			busterStaticProcess.stderr.on("data", function (data) {
				grunt.fail.fatal(data);
			});
			process.on("exit", function () {
				busterStaticProcess.kill();
			})
		})
	});

};
