Movies = new Mongo.Collection("movies");
Rls = new Mongo.Collection("rls");
this.Pages = new Meteor.Pagination(Movies,{
    router: "iron-router",
    //routerLayout: "layout",
    //routerTemplate: "Movies",
    templateName: "Movies",
    itemTemplate: "release",
    sort: {
    pubDate: -1
    },
    perPage: 20


});
  //, {sort:{pubDate:-1}
//  ,templateName: "Movies"
//});
/*Router.configure({
  layoutTemplate: 'layout'
});
*/
//Router.route('/', {name: 'Movies'});
     