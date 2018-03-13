var request = require('request');
var mysql = require('mysql');
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
var connection = mysql.createConnection({host: process.env.MYSQL_HOST, user: process.env.MYSQL_USER, password: process.env.MYSQL_PASSWORD, database: process.env.MYSQL_DB});

exports.handler = (event, context, callback) => {
  // Send the HTTP request to the Messenger Platform podcasts
  getLatestVideos('431657887270088', function (videos, videoIDs) {
    if (videos != 'NOVIDEOS') {
      updateVideoTags(videoIDs);
      //console.log('ready to send new podcast'); call function to fetch users in db
      console.log(videos);
      getUsers('podcasts', function (users) {
        callSendAPI(users, videos, function () {});
      });
      //// call function to send message to users
    }
  });

  // vlogs
  getLatestVideos('891287284385511', function (videos, videoIDs) {
    if (videos != 'NOVIDEOS') {
      updateVideoTags(videoIDs);
      //console.log('ready to send new podcast'); call function to fetch users in db
      console.log(videos);
      getUsers('vlogs', function (users) {
        callSendAPI(users, videos, function () {});
      });
      //// call function to send message to users
    }
  });

};

function updateVideoTags(videoIDs) {
  console.log(videoIDs);
  for (var i = 0; i < videoIDs.length; i++) {
    request({
      "uri": 'https://graph.facebook.com/v2.6/' + videoIDs[i],
      "qs": {
        "access_token": PAGE_ACCESS_TOKEN
      },
      "method": "POST",
      "body": "custom_labels=['botsent']"

    }, (err, res, body) => {
      if (!err) {
        console.log("this is body -------", body);
        console.log('videos updated');
      } else {
        console.error("Unable to send message:" + err);
      }
    })
  }
}

function getUsers(videoType, callback) {
  var psids = [];
  connection.query("SELECT * FROM users WHERE videoType='" + videoType + "';", function (error, results, fields) {
    if (error) {
      throw error;
    }
    for (var i = 0; i < results.length; i++) {
      psids.push(results[i].psid);
    }
    callback(psids);
  });
}

function getLatestVideos(id, callback) {
  request({
    "uri": 'https://graph.facebook.com/v2.6/' + id + '?fields=videos{permalink_url,custom_labels}',
    "qs": {
      "access_token": PAGE_ACCESS_TOKEN
    },
    "method": "GET"
  }, (err, res, body) => {
    if (!err) {
      var obj = JSON.parse(body);
      var videosArray = obj.videos.data;
      console.log(videosArray);
      var newVideos = [];
      var updateVideos = [];
      for (var item = 0; item < videosArray.length; item++) {
        if (videosArray[item].custom_labels) {
          if (!videosArray[item].custom_labels.includes('botsent')) {
            newVideos.push(videosArray[item].permalink_url);
            updateVideos.push(videosArray[item].id);
          }
        } else {
          newVideos.push(videosArray[item].permalink_url);
          updateVideos.push(videosArray[item].id);
        }

      }
      console.log(updateVideos);
      if (newVideos.length < 1) {
        newVideos = 'NOVIDEOS';
      }
    } else {
      console.error("Unable to send message:" + err);
    }
    callback(newVideos, updateVideos)
  })
}

function callSendAPI(userArray, videoArray, callback) {

  var responses = [];
  for (var i = 0; i < videoArray.length; i++) {
    responses.push({
      "attachment": {
        "type": "template",
        "payload": {
          "template_type": "media",
          "elements": [
            {
              "media_type": "video",
              "url": "https://www.facebook.com" + videoArray[i]
            }
          ]
        }
      }
    });
  }

  for (var response = 0; response < responses.length; response++) {
    for (var i = 0; i < userArray.length; i++) {
      request({
        "uri": "https://graph.facebook.com/v2.6/me/messages",
        "qs": {
          "access_token": PAGE_ACCESS_TOKEN
        },
        "method": "POST",
        "json": {
          "recipient": {
            "id": "" + userArray[i] + ""
          },
          "message": {
            "text": "Hey friend! Here is the latest video uploaded. Enjoy :)"
          },
          "tag": "NON_PROMOTIONAL_SUBSCRIPTION"
        }
      }, (err, res, body) => {
        if (!err) {
          console.log('message sent!')
          console.log(body);
        } else {
          console.error("Unable to send message:" + err);
        }
      });
      // Send the HTTP request to the Messenger Platform
      request({
        "uri": "https://graph.facebook.com/v2.6/me/messages",
        "qs": {
          "access_token": PAGE_ACCESS_TOKEN
        },
        "method": "POST",
        "json": {
          "recipient": {
            "id": "" + userArray[i] + ""
          },
          "message": responses[response],
          "tag": "NON_PROMOTIONAL_SUBSCRIPTION"
        }
      }, (err, res, body) => {
        if (!err) {
          console.log('message sent!')
          console.log(body);
        } else {
          console.error("Unable to send message:" + err);
        }
      });
    }
  }
  callback();
}