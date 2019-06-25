var { createClient } = require('webdav');
var _cliProgress = require("cli-progress");
var argv = require('minimist')(process.argv.slice(2))
var chalk = require('chalk')
require("dotenv").config();
var ora = require('ora');

const bar = new _cliProgress.Bar({}, _cliProgress.Presets.shades_classic);

let sleep = function (time) {
	return new Promise((resolve) => setTimeout(resolve, time));
}

if(!process.env['SOURCE_HOST'] || !process.env['DESTINATION_HOST']) {
	console.log("Must have a source and destination host defined");
	process.exit()
}

var client = createClient(
    process.env['SOURCE_HOST'],
    {
        username: process.env['SOURCE_USER'],
        password: process.env['SOURCE_PASS']
    }
);

var sandbox_client = createClient(
    process.env['DESTINATION_HOST'],
    {
	    username: process.env['DESTINATION_USER'],
    	password: process.env['DESTINATION_PASS']
    }
);

var filePaths = [];
var pathname = "/";

// if(!argv["full"]) {
// "NOTE: This job defaults to pulling in files modified in the last 24 hours. If you need to pull all files, run this with the --full parameter. \n\n"
// }

var getContents = function async (pathname) {
	return client.getDirectoryContents(pathname, { deep: true})
		.then(async (contents) => {
			if(contents.length) {
				for(var i = 0; i < contents.length; i++) {
					if(contents[i].type == "directory") {
						await getContents(contents[i].filename);
					} else {
						if(!argv["full"]) {
							var modifiedDate = Math.round(new Date(contents[i]["lastmod"]).getTime() / 1000);
							var twentyFourHoursAgo = Math.round(new Date().getTime() / 1000) - (24 * 3600);
							if(modifiedDate > twentyFourHoursAgo) {
								filePaths.push(contents[i])
							}
						} else {
							filePaths.push(contents[i]);
						}

					}
				}
			} // else Directory is empty
			return true;
		})
		.catch((err) => {
			console.log("ERROR in webdav request: ", err);
		});
}

module.exports = function(args) {
	console.log("")
	const spinner = ora().start();
	spinner.color = 'yellow';
	spinner.text = 'Building list of files \n';

	return getContents(pathname).then(async () => {

		spinner.succeed("Found " + filePaths.length + " file paths");

		if (filePaths.length == 0) {
				return false;
		}

		if (filePaths.length) {

			console.log("\nMoving files...\n");
			bar.start(filePaths.length, 0);
			for (var i = 0; i < filePaths.length; i++) {
				bar.update(i+1);
				if(filePaths[i].filename.indexOf("DS_Store") < 0) {
					await client.createReadStream(filePaths[i].filename)
						.pipe(sandbox_client.createWriteStream(filePaths[i].filename));
					await sleep(300);
				}
			}

			bar.stop();
			console.log(chalk.green("\nComplete!"))

		}
	}).catch((err) => console.log("Push error: ", err));
};
