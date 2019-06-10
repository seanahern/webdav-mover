var { createClient } = require('webdav');
var _cliProgress = require("cli-progress");
var argv = require('minimist')(process.argv.slice(2))
require("dotenv").config();

const bar = new _cliProgress.Bar({}, _cliProgress.Presets.shades_classic);

let sleep = function (time) {
	return new Promise((resolve) => setTimeout(resolve, time));
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

if(!argv["full"]) {
	console.log("NOTE: This job defaults to pulling in files modified in the last 24 hours. If you need to pull all files, run this with the --full parameter. \n\n");
}

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

console.log("Building list of file paths...");
getContents(pathname).then(async () => {
    console.log("\nFound " + filePaths.length + " file paths");
    if(filePaths.length == 0) {
        return false;
    }
	bar.start(filePaths.length, 0);
	for (var i = 0; i < filePaths.length; i++) {
		if(filePaths[i].filename.indexOf("DS_Store") < 0) {
			await client.createReadStream(filePaths[i].filename)
				.pipe(sandbox_client.createWriteStream(filePaths[i].filename));
			bar.update(i);
			await sleep(300);
		}
 	}
	bar.stop();
}).catch((err) => console.log("Push error: ", err));