var socket = io.connect(location.protocol + '//' + location.hostname +
  (location.port ? ':' + location.port : ''));

angular.module('chatspaces', [
  'ngRoute',
  'chatspaces.factories',
  'chatspaces.controllers'
]).
run(function ($rootScope, $http, $location, authenticate) {
  $rootScope.$on('$routeChangeStart', function (event, next, current) {
    if (!$rootScope.isAuthenticated) {
      $location.path('/');
    } else {
      $http({
        url: '/api/profile',
        method: 'GET'
      }).success(function (data) {
        $rootScope.email = data.email;
        $rootScope.username = data.username;
        $rootScope.userHash = data.userHash;
        $rootScope.avatar = data.avatar;
        $rootScope.isAuthenticated = true;
        $rootScope.picture = '';

        localForage.getItem($rootScope.userHash + ':lastPic', function (pic) {
          if (pic) {
            $rootScope.picture = pic;
          }
        });

        localForage.getItem($rootScope.userHash + ':latestMessageKey', function (key) {
          if (key) {
            $rootScope.latestMessage = key;
          }
        });

        socket.emit('join', {
          email: data.email
        });

        if (!$rootScope.username) {
          localForage.setItem('newUser', true);
          localForage.setItem('firstMessage', true);
          $location.path('/new');
        } else if ($location.path() === '/') {
          $location.path('/dashboard');
        }
      }).error(function (data) {
        authenticate.logout();
      });
    }
  });
}).
service('user', function ($rootScope) {
  return {
    call: function () {
      $rootScope.isAuthenticated = false;
      $rootScope.settings = false;
      $rootScope.friends = {};
      $rootScope.messages = {};
      $rootScope.blocked = {};
      $rootScope.notifications = [];
    }
  }
}).
service('api', function ($http, $timeout, $rootScope) {
  return {
    call: function () {
      $rootScope.hasMessages = false;

      $timeout(function () {
        console.log('calling services');
        $http({
          url: '/api/following',
          method: 'GET'
        });

        $http({
          url: '/api/blocked',
          method: 'GET'
        });

        $http({
          url: '/api/notifications',
          method: 'GET'
        });
      }, 500);

      localForage.getItem('firstMessage', function (st) {
        if (!st) {
          $rootScope.hasMessages = true;
        }
      });
    }
  };
}).
config(function ($routeProvider, $locationProvider) {
  $routeProvider
    .when('/', {
      controller: 'HomeCtrl',
      templateUrl: 'partials/home.html'
    })
    .when('/new', {
      controller: 'ProfileCtrl',
      templateUrl: 'partials/new_profile.html'
    })
    .when('/profile', {
      controller: 'ProfileCtrl',
      templateUrl: 'partials/profile.html'
    })
    .when('/dashboard', {
      controller: 'DashboardCtrl',
      templateUrl: 'partials/dashboard.html'
    })
    .when('/blocked', {
      controller: 'BlockedCtrl',
      templateUrl: 'partials/blocked.html'
    })
    .when('/friends', {
      controller: 'FriendCtrl',
      templateUrl: 'partials/friends.html'
    })
    .when('/search', {
      controller: 'FriendCtrl',
      templateUrl: 'partials/search.html'
    })
    .when('/message', {
      controller: 'MessageCtrl',
      templateUrl: 'partials/message.html'
    })
    .when('/drafts', {
      controller: 'DraftsCtrl',
      templateUrl: 'partials/drafts.html'
    })
    .when('/thread/:senderKey', {
      controller: 'MessageCtrl',
      templateUrl: 'partials/thread.html'
    })
    .otherwise({
      redirectTo: '/'
    });

  $locationProvider.html5Mode(true);
}).
filter('orderObjectBy', function () {
  return function (items, field) {
    var filtered = [];

    angular.forEach(items, function (item) {
      filtered.push(item);
    });

    try {
      filtered.sort(function (a, b) {
        return a[field] > b[field];
      });

      filtered.reverse();
    } catch (err) {
      console.log('Could not sort messages');
    }

    return filtered;
  };
});
