var request = require('request'),
	json2csv= require('json2csv'),
	fs      = require('fs'),
	express = require('express'),
    app     = express(),
    server  = app.listen(8080),
    io      = require('socket.io').listen(server);

app.use(express.static(__dirname));   

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/home.html');
});

io.on('connection', function(socket) {
    socket.on('search', function(key, city, page){		
    	io.emit('status', 'Starting Data scrapping...');

      	first(key, city, 1, parseInt(page), 1);
    });

    socket.on('error', function(e) {
    	console.log(e);
		io.emit('err', e);
    });
});

function first(key, city, run, page, cnt){
  	var options = {
	    url: 'http://dir.indiamart.com/search.mp?ss='+key+'&cq='+city+'&pg='+run+'&c=IN&scroll=1&pr=0&frsc=20',
	    headers: {
	    	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.79 Safari/537.36'
	    }
  	};

  	request(options, function(err, res, htm){
	    if (!err) {
	      	var jso = JSON.parse(htm),
	      		len = jso.length,
	      		hea = ['name','location','company','address','mobile','website','verified'];

	      	jso.forEach(function(i, j){
		        var out = [{
		          	name: i.prd_flname,
		          	location: i.city_with_duplicate,
		          	company: i.complink,
		          	address: i.address.replace(/<(?:.|\n)*?>/gm, ''),
		          	mobile: i.contact_no.replace(/<(?:.|\n)*?>/gm, '').split(' ')[1],
		          	website: i.weblink.replace(/<(?:.|\n)*?>/gm, ''),
		          	verified: i.trust_seal.indexOf('Vrfd-Icon') >= 0 ? 'verified' : i.trust_seal.indexOf('trustSeal') >= 0 ? 'trustseal' : false
		        }];

		        json2csv({data: out, hasCSVColumnTitle: false, fields: hea}, function(err, csv) {
				  	if (err) console.log(err);

				  	fs.appendFile(key+'.csv', csv+"\r\n", function(err) {
                  		if (err) throw err;

                  		io.emit('status', len+' data for "'+key+'" on page '+run+'/'+page+' written successfully!');

                  		if (++cnt > len && run < page) {
				          	first(key, city, ++run, page, 1);
				        } else if (cnt > len && run >= page) {
			          		io.emit('file', 'Data scrapping completed successfully!');
			          	} 
                	});
				});		                  
	      	});
	    } else {
	      	console.log(err);
	    }
  	});
}

console.log('Open localhost with port 8080');