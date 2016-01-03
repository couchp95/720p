if (Meteor.isClient) {

  Template.body.helpers({
    total: function() {
      return Movies.find().count();
    },
    releases: function() {
      return Movies.find({},{sort:{pubDate:-1},limit:50}).fetch();
    }
  });
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
  });
}
