

function extractRlsname(currentMovie) {
	var re1='.*?';  // Non-greedy match on filler
	var re2='((?:(?:[1]{1}\\d{1}\\d{1}\\d{1})|(?:[2]{1}\\d{3})))(?![\\d|P|p])'; // Year 1
	var p = new RegExp(re2,["g"]);
	var t,m;
	var releaseName=currentMovie.releaseName;
	do {
		t=m;
		m=p.exec(releaseName);
	}
	while (m!=null)
	
	if (t) {
		var title=releaseName.substr(0,t.index-1);
		title=title.replace(/\./g, " ")
		var year=t[1];
		//console.log("Title: " + title + " Year: " + year);
		currentMovie.title=title;
		currentMovie.year=year;
	} else {
		var re3='(720)|(1080)';
		releaseName=currentMovie.releaseName;
		t=RegExp(re3,["g"]).exec(releaseName);
		if (t) {
	  		title=releaseName.substr(0,t.index-1);
	  		title=title.replace(/\./g, " ");
	  		year=null;
	  		currentMovie.title=title;
	  		currentMovie.year=year;
		}
	}
}

function queryOMDB (currentMovie) {
	//get Movie's IMDB's ID, rating and other stuff from OMDB
	var url;
	if (currentMovie.imdbID) {
		url = "http://www.omdbapi.com/?i=" + currentMovie.imdbID + "&plot=short&r=json";
	} else {
		url = "http://www.omdbapi.com/?t=" + currentMovie.title + "&y=" + currentMovie.year + "&plot=short&r=json";
	}
	try {
		var result = HTTP.get(url,{timeout:5000});
		if (result.statusCode === 200) {
        	result=result.data;
        	if (result.Response==="True") {
				currentMovie.title=result.Title;
				currentMovie.imdbID=result.imdbID;
				currentMovie.imdbRating=result.imdbRating;
				currentMovie.imdbVotes=result.imdbVotes;
				currentMovie.Runtime=result.Runtime;
				currentMovie.Released=result.Released;
				currentMovie.Genre=result.Genre;
				currentMovie.Language=result.Language;
				currentMovie.Country=result.Country;
				currentMovie.Awards=result.Awards;
				currentMovie.Poster=result.Poster;
				return 1;
			} else {
				console.log(currentMovie.releaseName," is not found in OMDB");
				return -1;
			}
		} else {
			console.log("Error! statusCode <> 200!!!");
			return 0;			
		}
	} catch (e) {
		console.log("queryOMDB error with" + e, currentMovie.releaseName ,  currentMovie.year ,"on: " + url);
		return 0;
	}
}

function queryTMDB (currentMovie) {
	var api_key='e52ee0b4a8978c51e00adcdb73b8b4e6';
	var url = "http://api.themoviedb.org/3/search/movie?query=" + currentMovie.title + "&api_key=" + api_key;
	//search for TMDB ID from TMDB
	try {
		var result = HTTP.get(url,{timeout:5000});
		if (result.statusCode === 200) {
			result=result.data;
			if (result.total_results>0) {
				url = "http://api.themoviedb.org/3/movie/" + result.results[0].id + "?api_key=" + api_key;
				//search for IMDB ID from TMDB
				try {
					result = HTTP.get(url,{timeout:5000});
					if (result.statusCode === 200) {
						result=result.data;
						currentMovie.title=result.title;
						currentMovie.imdbID=result.imdb_id;
						//get Movie's information such as rating and other stuff from OMDB by IMDB ID
						var rt=queryOMDB(currentMovie);
						//console.log("queryOMDB:",rt, currentMovie.title, currentMovie.imdbID);
						return (rt);
					}
				} catch (e) {
					console.log("queryTMDB http.get error with" + e, currentMovie.releaseName ,  currentMovie.year ,"on: " + url); 
					return 0;
				}
			} else {
				console.log(currentMovie.releaseName," is not found in TMDB");
				return -1;
			}
		} else {        
			console.log("Error! statusCode <> 200!!!");
			return 0;
		}
	} catch (e) {
		console.log("queryTMDB error with" + e, currentMovie.releaseName ,  currentMovie.year ,"on: " + url);
	 	return 0;
	 }
}

function queryDouban(currentMovie) {
	//search for Douban ID 
	Meteor._sleepForMs(7000);
	var url = "https://api.douban.com/v2/movie/search?q=" + currentMovie.title + " " + currentMovie.year + "&start=0&count=1";
	try {
		result = HTTP.get(url,{timeout:5000});
		if (result.statusCode === 200) {
			result=result.data;
			if ((result.total > 0) && result.subjects[0].id){
				//search for IMDB ID
				$ = cheerio.load(Meteor.http.get("http://movie.douban.com/subject/"+result.subjects[0].id).content);
				var imdbID=$('#info [href]').last().text();
				//console.log(currentMovie.releaseName,imdbID);
				if (imdbID) {
					currentMovie.imdbID=imdbID;
					return(queryOMDB(currentMovie));
				}
				else return -1;
			}
			else {
				console.log(currentMovie.releaseName," is not found in Douban");
				return -1;
			}
		} else return 0;
	} catch (e) {
		console.log("queryDouban error with" + e, currentMovie.releaseName ,  currentMovie.year ,"on: " + url);
		return 0;
	}
}

function getIMDBid (currentMovie) {
	if (queryOMDB(currentMovie) < 0) {
		if (queryTMDB(currentMovie) < 0) {
			if (queryDouban(currentMovie) <0) {
				console.log("### Cannot find", currentMovie.releaseName, "IMDB ID from anythere!");
				return -1;
			}
		}
	}

}



function enrichMovie (currentMovie) {
	Meteor._sleepForMs(7000);
	var url = "http://api.douban.com/v2/movie/imdb/" + currentMovie.imdbID;
	try {
		result = HTTP.get(url,{timeout:5000});
		if (result.statusCode === 200) {
			var DBid=RegExp('(\\d+)',["g"]).exec(result.data.alt);
			currentMovie.doubanID=DBid[1];
			url = "http://api.douban.com/v2/movie/subject/" + DBid[1];
			//console.log(url);
			if (result.data.attrs.movie_duration) currentMovie.Runtime=result.data.attrs.movie_duration;
			if (result.data.attrs.language) currentMovie.Language=result.data.attrs.language;
			Meteor._sleepForMs(7000);
			result = HTTP.get(url,{timeout:5000});
			if (result.statusCode === 200) {
				result=result.data;
				//console.log(result);
				if (result.original_title) currentMovie.title=result.original_title;
				if (result.title) currentMovie.titleCN=result.title;
				if (result.rating.average) currentMovie.ratingDB=result.rating.average;
				if (result.ratings_count) currentMovie.votedDB=result.ratings_count;
				if (result.summary) currentMovie.summary=result.summary;
				if (result.genres) currentMovie.Genre=result.genres;
				if (result.countries) currentMovie.Country=result.countries;
				if (result.images.large) currentMovie.Poster=result.images.large;
				if (result.subtype) currentMovie.subtype=result.subtype;
				if (result.aka) currentMovie.aka=result.aka;
				if (result.directors) currentMovie.directors=result.directors;
				if (result.casts) currentMovie.casts=result.casts;
				if (result.year) currentMovie.year=result.year;

				//console.log(currentMovie.releaseName, "\n", Good, currentMovie.title, currentMovie.titleCN, currentMovie.year,currentMovie.imdbID,currentMovie.imdbRating,currentMovie.ratingDB,currentMovie.summary);
				return 1;
			}
		return -1;
		} 
	} catch (e) {
		//console.log(Boolean(String(e).indexOf("movie_not_found")));
		if (String(e).indexOf("movie_not_found") >= 0) return -1;
		else {
			console.log("enrichMovie http.get error with" + e, currentMovie.imdbID ,  currentMovie.year ,"on: " + url);
			return 0;
		}
	}
}
/*
function checkFeed(feedURL) {
	movieFeed = Scrape.feed(feedURL);
	console.log("Got feed ### ", movieFeed.items.length);
	var currentMovie=new Object();
	for (i=0;i<movieFeed.items.length;i++) {
		currentMovie={};
		if ((movieFeed.items[i].title) && (Boolean(Movies.findOne({"releaseName":movieFeed.items[i].title})) === false)) {
			currentMovie.releaseName = movieFeed.items[i].title;
			currentMovie.pubDate = movieFeed.items[i].pubDate;
			extractRlsname(currentMovie);
			getIMDBid(currentMovie);
			//console.log(currentMovie.releaseName, currentMovie.imdbID);
			if (currentMovie.imdbID) {
				if (enrichMovie(currentMovie)>0) {
        			console.log(currentMovie.releaseName, "\n", currentMovie.title, currentMovie.titleCN, currentMovie.year,currentMovie.imdbID,currentMovie.imdbRating,currentMovie.ratingDB,currentMovie.summary);
					Movies.insert(currentMovie);
				}
			}
		}
	}
}
*/
//Meteor.setInterval(function () {
//    checkFeed("http://predb.me/?search=cats%3Amovies-hd+720p&rss=1")
//}, 3600000);


function scrapePredb(year,cpage) {
	for (var page=cpage;page>=0;page--) {
		//var pageUrl="http://predb.me/?search=cats%3Amovies-hd+720p&page="+page;
		var pageUrl="http://predb.me/?search=cats%3Amovies-hd+720p+"+year+"&page="+page;
		//scrapePage(pageUrl,page);
		scrapeRelease(pageUrl,page);
	}
}

function scrapePage(url,page) {
	try {
		console.log("***** Page", page, "scraping start at", Date());
		$=cheerio.load(Meteor.http.get(url,{headers: {'user-agent': "dMozilla/5.0 (Macintosh; Intel Mac OS X 10_8_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/31.0.1650.63 Safari/537.36",
		'accept': "text/html,application/xhtml+xml",
		'Accept-Charset': "UTF-8"
		}}).content);
		var currentMovie=new Object();
		var rlsList=$("a.p-title");
  		var rlsTime=$("span.p-time");
  		for (i=0;i<rlsList.length;i++) {
			currentMovie={};
			currentMovie.releaseName=rlsList[i].children[0].data; 
   			currentMovie.pubDate= new Date(rlsTime[i].children[0].parent.attribs.data*1000);
			if ((currentMovie.releaseName) && (Boolean(Movies.findOne({"releaseName":currentMovie.releaseName})) === false)) {
				extractRlsname(currentMovie);
				getIMDBid(currentMovie);
				//console.log(currentMovie.releaseName, currentMovie.imdbID);
				if (currentMovie.imdbID) {
					if (enrichMovie(currentMovie)>0) {
	        			console.log(currentMovie.releaseName, "\n", currentMovie.title, currentMovie.titleCN, currentMovie.year,currentMovie.imdbID,currentMovie.imdbRating,currentMovie.ratingDB,currentMovie.summary);
						Movies.insert(currentMovie);
					}
				}

			}
		}
		console.log("***** Successfully scraped Page", page, "at", Date(), url);
	} catch (e) {
		console.log ("******* Error with", e);
	}

}

function scrapeRelease(url,page) {
	try {
		console.log("***** Page", page, "scraping start at", Date());
		$=cheerio.load(Meteor.http.get(url,{headers: {'user-agent': "dMozilla/5.0 (Macintosh; Intel Mac OS X 10_8_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/31.0.1650.63 Safari/537.36",
		'accept': "text/html,application/xhtml+xml",
		'Accept-Charset': "UTF-8"
		}}).content);
		var currentMovie=new Object();
		var rlsList=$("a.p-title");
  		var rlsTime=$("span.p-time");
  		for (i=0;i<rlsList.length;i++) {
			currentMovie={};
			currentMovie.releaseName=rlsList[i].children[0].data; 
   			currentMovie.pubDate= new Date(rlsTime[i].children[0].parent.attribs.data*1000);
   			currentMovie.OMDB=0;
   			currentMovie.TMDB=0;
   			currentMovie.Douban=0;
   			currentMovie.needReview=0;
   			//console.log(currentMovie.releaseName);
   			//console.log(Rls.findOne({"releaseName":currentMovie.releaseName}),Boolean(Rls.findOne({"releaseName":currentMovie.releaseName})));
   			if (Boolean(Rls.findOne({"releaseName":currentMovie.releaseName})) === false) Rls.insert(currentMovie);
		}
		console.log("***** Successfully scraped Page", page, "at", Date(), url);
	} catch (e) {
		console.log ("******* Error with", e);
	}

}

function scrapeAll() {
	var pages=0;
	for (var y=1950;y<=2015;y++) {
		var url="http://predb.me/?search=cats%3Amovies-hd+bluray+720p+"+y;
		$=cheerio.load(Meteor.http.get(url,{headers: {'user-agent': "dMozilla/5.0 (Macintosh; Intel Mac OS X 10_8_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/31.0.1650.63 Safari/537.36",
		'accept': "text/html,application/xhtml+xml",
		'Accept-Charset': "UTF-8"
		}}).content);
		var currentYearPages=RegExp("(\\d+)").exec($(".page-list").find("li").last().text())[1];	
		pages=pages+currentYearPages;
		scrapePredb(y,currentYearPages);	
	}
	console.log("**** Total",pages,"pages since 1950");
}
//scrapeAll();
//scrapePredb(2015,2);


function checkRlsDatabase() {
	var rlsList=Rls.find({imdbID:null},{sort:{pubDate:1}});
	rlsList.forEach(function (eachRls) {
		var cRelease=eachRls,OMDB=0,TMDB=0,Douban=0;
		if (RegExp("720").exec(cRelease.releaseName)) cRelease.Format="720p"
			else if (RegExp("1080").exec(cRelease.releaseName)) cRelease.Format="1080p";
		extractRlsname(cRelease);
		//if current Release is a new movie
		var moviefind=Movies.findOne({"title":cRelease.title,"year":cRelease.year})
		if (Boolean(moviefind)) {
			cRelease.imdbID=moviefind.imdbID;
			if (cRelease.pubDate<moviefind.pubDate) Movies.update({imdbID:cRelease.imdbID},{$set:{pubDate:cRelease.pubDate}});
			Rls.update({releaseName:cRelease.releaseName},{$set:{imdbID:cRelease.imdbID,Format:cRelease.Format, needReview:0}});
		} else {
			if (cRelease.OMDB===0) {
				OMDB=queryOMDB(cRelease);
				Rls.update({releaseName:cRelease.releaseName},{$set:{OMDB:OMDB,Format:cRelease.Format}});
				cRelease.OMDB=OMDB;
				cRelease.needReview=0;
				if (OMDB===1) insertMovies(cRelease);	
			} else {
				if (cRelease.TMDB===0) {
					TMDB=queryTMDB(cRelease);
					Rls.update({releaseName:cRelease.releaseName},{$set:{TMDB:TMDB,Format:cRelease.Format}});
					cRelease.TMDB=TMDB;
					cRelease.needReview=0;
					if (TMDB===1) insertMovies(cRelease);
				} else {
					if (cRelease.Douban===0) {
						Douban=queryDouban(cRelease);
						Rls.update({releaseName:cRelease.releaseName},{$set:{Douban:Douban,Format:cRelease.Format}});
						cRelease.Douban=Douban;
						if (Douban===1) {
							cRelease.needReview=1;
							insertMovies(cRelease);
							Rls.update({releaseName:cRelease.releaseName},{$set:{needReview:1}});
							//Movies.update({imdbID:cRelease.imdbID},{$set:{needReview:1}});
						}

					}
				}
			}
		}
		console.log(cRelease.pubDate, cRelease.imdbID, "OMDB", cRelease.OMDB, "TMDB", cRelease.TMDB, "Douban", cRelease.Douban, "needReview", cRelease.needReview , cRelease.releaseName);
	})
	//var r=extractReleaseName()

}

function insertMovies(cRelease) {
	var moviefind=Movies.findOne({"imdbID":cRelease.imdbID});
	if (!(Boolean(moviefind))) {
		Rls.update({releaseName:cRelease.releaseName},{$set:{imdbID:cRelease.imdbID,Format:cRelease.Format}});
		Movies.insert({
			title:cRelease.title,
			imdbID:cRelease.imdbID,
			imdbRating:cRelease.imdbRating,
			imdbVotes:cRelease.imdbVotes,
			Runtime:cRelease.Runtime,
			Released:cRelease.Released,
			Genre:cRelease.Genre,
			Language:cRelease.Language,
			Country:cRelease.Country,
			Awards:cRelease.Awards,
			Poster:cRelease.Poster,
			pubDate:cRelease.pubDate,
			year:cRelease.year,
			enriched:0,
			needReview:cRelease.needReview
		})						
	} else {
		if (cRelease.pubDate<moviefind.pubDate) Movies.update({imdbID:cRelease.imdbID},{$set:{pubDate:cRelease.pubDate}});
		Rls.update({releaseName:cRelease.releaseName},{$set:{imdbID:cRelease.imdbID,Format:cRelease.Format, OMDB:cRelease.OMDB, TMDB:cRelease.TMDB, Douban:cRelease.Douban}});
	}
}

function enrichMoviesDB () {
	var movieList=Movies.find({enriched:0},{timeout:false,sort:{pubDate:-1}});
	movieList.forEach(function (eachMovie) {
		var cMovie=eachMovie,enriched=0;
		enriched=enrichMovie(cMovie);
		if (enriched===1) {
			Movies.update({imdbID:cMovie.imdbID},{$set:{				
				doubanID:cMovie.doubanID,
				title:cMovie.title,
				titleCN:cMovie.titleCN,
				ratingDB:cMovie.ratingDB,
				votedDB:cMovie.votedDB,
				summary:cMovie.summary,
				Genre:cMovie.Genre,
				Country:cMovie.Country,
				Poster:cMovie.Poster,
				subtype:cMovie.subtype,
				aka:cMovie.aka,
				directors:cMovie.directors,
				casts:cMovie.casts,
				Runtime:cMovie.Runtime,
				Language:cMovie.Language,
				enriched:1
			}});
		} else Movies.update({imdbID:cMovie.imdbID},{$set:{enriched:enriched}}); 			
		console.log(cMovie.pubDate, cMovie.title, cMovie.imdbID, cMovie.doubanID, cMovie.titleCN, "Enriched", enriched);
	});	
}


function removeDuplicated () {
	var movieList=Movies.find({},{sort:{imdbID:1}});
	movieList.forEach(function (eachMovie) {
		var cMovie=eachMovie;
		a=Movies.findOne({imdbID:cMovie.imdbID},{sort:{pubDate:1}})
		Movies.remove({imdbID:cMovie.imdbID,_id:{$ne:a._id}});
		//console.log(cMovie.pubDate, cMovie.title, cMovie.imdbID, cMovie.doubanID, cMovie.titleCN, "Enriched", enriched);
	});	
}

checkRlsDatabase();
//enrichMoviesDB();

//Meteor.setTimeout(function () {	enrichMoviesDB();	},1000);
//enrichMoviesDB();
//var moviefind=Movies.findOne({"title":"Lady and the Tramp","year":"1955"});
//console.log(Boolean(moviefind));
/*
	var url = "http://api.douban.com/v2/movie/imdb/tt3143398";
	try {	result = HTTP.get(url,{timeout:5000});
		}
		catch (e){
		console.log(String(e));
		console.log(String(e).indexOf("TIME"));
		console.log(String(e).indexOf("NOTFOUND"))
	}

	*/
