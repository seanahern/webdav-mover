## static-mover

### Purpose
This is a node script that will migrate static files from one webdav server to another. By default, this script only moves files modified within the last 24 hours. 

### Usage

1. Install all dependencies with `npm install`

2. Create an environment file (`.env`) and provide the following environment variables:

`.env`
```
SOURCE_HOST=
SOURCE_USER=
SOURCE_PASS=

DESTINATION_HOST=XXXX.XXX.XXX
DESTINATION_USER=
DESTINATION_PASS=
```

These environment variables should map to a URL, username, and password for the source and destination webdav servers. Files will be moved from the source and placed on the destination server at the same path location.

3. Run `npm run move` to begin running the script. 

### Available commands

`npm run move` — This script runs the default behavior of checking the source server for recently modified files and moving them. 

`npm run move:all` — `move:all` moves all of the files from the source to the destination, regardless of modified date


