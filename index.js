// Example express application adding the parse-server module to expose Parse
// compatible API routes.

var express = require('express');
var ParseServer = require('parse-server').ParseServer;
var ParseDashboard = require('parse-dashboard');
var path = require('path');

var databaseUri = process.env.DATABASE_URI || process.env.MONGOLAB_URI 
	|| process.env.MONGODB_URL;
    
//append databaseName to MONGODB_URL in case of openshift local mongodb cartrige 
if(process.env.OPENSHIFT_APP_NAME && process.env.MONGODB_URL) {
	databaseUri += 'parse-server';
}

if (!databaseUri) {
  console.log('DATABASE_URI not specified, falling back to localhost.');
}

var port =  process.env.NODE_PORT || process.env.PORT || 1337;
var ip = process.env.NODE_IP || process.env.IP || 'localhost';

// Serve the Parse API on the /parse URL prefix
var mountPath = process.env.PARSE_MOUNT || '/parse';

var serverURL = 'http://localhost:1337' + mountPath;
if(process.env.OPENSHIFT_APP_DNS) {
  serverURL = 'https://' + process.env.OPENSHIFT_APP_DNS  + mountPath;
}

var server = {
  databaseURI: databaseUri || 'mongodb://localhost:27017/dev',
  cloud: process.env.CLOUD_CODE_MAIN || __dirname + '/cloud/main.js',
  appId: process.env.APP_ID || 'myAppId',
  masterKey: process.env.MASTER_KEY || 'myMasterKey', //Add your master key here. Keep it secret!
  fileKey: process.env.FILE_KEY || 'invalid-file-key',
  serverURL: process.env.SERVER_URL || serverURL,  // Don't forget to change to https if needed
  liveQuery: {
    classNames: ["Posts", "Comments"] // List of classes to support for query subscriptions
  }
};
//Init ParseDashboard
var dashboard = {
  apps: [
    {
      appId: server.appId,
      serverURL: process.env.SERVER_URL || serverURL,
      masterKey: server.masterKey,
      appName: process.env.WEBSITE_SITE_NAME || process.env.OPENSHIFT_APP_DNS || 'Parse Server Dashboard'
    }
  ],
  users: [
    {
      user: server.appId,
      pass: server.masterKey
    }
  ]
};
  
var api = new ParseServer(server);
// Client-keys like the javascript key or the .NET key are not necessary with parse-server
// If you wish you require them, you can set them as options in the initialization above:
// javascriptKey, restAPIKey, dotNetKey, clientKey

var app = express();

// Force https for security. Remove the following block if you want to allow http access
app.use(function(req, res, next) {
	if (req.headers['x-forwarded-proto'] == 'http') {
		res.redirect('https://' + req.headers.host + req.path);
	} else {
		return next();
	}
});

// Serve static assets from the /public folder
app.use('/public', express.static(path.join(__dirname, '/public')));

app.use(mountPath, api);
  
//Serve ParseDashboard
app.use('/parse-dashboard', ParseDashboard(dashboard, true));
 
// Parse Server plays nicely with the rest of your web routes
app.get('/', function(req, res) {
  res.status(200).send('Make sure to star the parse-server repo on GitHub!');
});

// There will be a test page available on the /test path of your server url
// Remove this before launching your app
app.get('/test', function(req, res) {
  res.sendFile(path.join(__dirname, '/public/test.html'));
});

var httpServer = require('http').createServer(app);
httpServer.listen(port, ip, function() {
    console.log('parse-server-example running on port ' + port + '.');
});

// This will enable the Live Query real-time server
ParseServer.createLiveQueryServer(httpServer);
