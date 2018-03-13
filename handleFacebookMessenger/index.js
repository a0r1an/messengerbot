const request = require('request');
var AWS = require('aws-sdk');
var lambda = new AWS.Lambda();
var mysql = require('mysql');
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
var connection = mysql.createConnection({host: process.env.MYSQL_HOST, user: process.env.MYSQL_USER, password: process.env.MYSQL_PASSWORD, database: process.env.MYSQL_DB});

exports.handler = (event, context, callback) => {
  if (event.object === 'page') {
    console.log('event is', event);
    console.log('context is', context);
    event
      .entry
      .forEach(function (entry) {
        // Gets the body of the webhook event
        console.log('this is entry messaging --- ', entry.messaging);
        let webhook_event = entry.messaging[0];
        // Get the sender PSID
        let sender_psid = webhook_event.sender.id;
        console.log('webhook event ', webhook_event);
        console.log('sender_psid is ', sender_psid);
        if (webhook_event.message) {
          handleMessage(sender_psid, webhook_event.message);
        } else if (webhook_event.postback) {
          handlePostback(sender_psid, webhook_event.postback);
        }
      });
  }
};

// Handles messages events
function handleMessage(sender_psid, received_message) {
  let response;
  // Checks if the message contains text
  if (received_message.text) {
    response = {
      "text": "Hmmm. Let me get back to you on that."
    }
  }
  if (received_message.attachments) {
    // Get the URL of the message attachment
    response = {
      "text": "Hmmmm... That's interesting"
    }
  }
  // Send the response message
  callSendAPI(sender_psid, response);
}

// Handles messaging_postbacks events
function handlePostback(sender_psid, received_postback) {
  let response;
  // Get the payload for the postback
  let payload = received_postback.payload;
  if (payload === 'get started clicked') {
    response = {
      "attachment": {
        "type": "template",
        "payload": {
          "template_type": "button",
          "text": "Hey buddy, thanks for following my page! Would you like to get updates about my " +
              "latest videos?",
          "buttons": [
            {
              "type": "postback",
              "title": "Yes",
              "payload": "subscribe"
            }, {
              "type": "postback",
              "title": "No",
              "payload": "nosubscribe"
            }
          ]
        }
      }
    }
    callSendAPI(sender_psid, response);
  } else if (payload == 'subscribe') {
    response = {
      "attachment": {
        "type": "template",
        "payload": {
          "template_type": "button",
          "text": "Awesome! What kind of videos will you like?",
          "buttons": [
            {
              "type": "postback",
              "title": "Vlogs",
              "payload": "vlogs"
            }, {
              "type": "postback",
              "title": "Podcasts",
              "payload": "podcasts"
            }, {
              "type": "postback",
              "title": "All Videos",
              "payload": "all"
            }
          ]
        }
      }
    }
    var newUserData = {
      psid: sender_psid,
      subscriber: true,
      dateStamp: new Date()
        .toISOString()
        .slice(0, 19)
        .replace('T', ' ')
    }
    upsertUser(newUserData);
    callSendAPI(sender_psid, response);
  } else if (payload == 'nosubscribe') {
    response = {
      "text": "No worries! Let me know if you need anything."
    }
    var newUserData = {
      psid: sender_psid,
      subscriber: false,
      videoType: null,
      dateStamp: new Date()
        .toISOString()
        .slice(0, 19)
        .replace('T', ' ')
    }
    upsertUser(newUserData);
    callSendAPI(sender_psid, response);
  } else if (payload === 'vlogs') {
    response = {
      "attachment": {
        "type": "template",
        "payload": {
          "template_type": "media",
          "elements": [
            {
              "media_type": "video",
              "url": "https://www.facebook.com/eufracioLive/videos/1666330163425749/"
            }
          ]
        }
      }
    }
    var newUserData = {
      psid: sender_psid,
      videoType: "vlogs",
      dateStamp: new Date()
        .toISOString()
        .slice(0, 19)
        .replace('T', ' ')
    }
    upsertUserVideoType(newUserData);
    callSendAPI(sender_psid, response);
  } else if (payload === 'podcasts') {
    response = {
      "attachment": {
        "type": "template",
        "payload": {
          "template_type": "media",
          "elements": [
            {
              "media_type": "video",
              "url": "https://www.facebook.com/eufracioLive/videos/1683520431706722/"
            }
          ]
        }
      }
    }
    var newUserData = {
      psid: sender_psid,
      videoType: "podcasts",
      dateStamp: new Date()
        .toISOString()
        .slice(0, 19)
        .replace('T', ' ')
    }
    upsertUserVideoType(newUserData);
    callSendAPI(sender_psid, response);
  } else if (payload === 'all') {
    response = {
      "attachment": {
        "type": "template",
        "payload": {
          "template_type": "media",
          "elements": [
            {
              "media_type": "video",
              "url": "https://www.facebook.com/eufracioLive/videos/1684497984942300/"
            }
          ]
        }
      }
    }
    var newUserData = {
      psid: sender_psid,
      videoType: "all",
      dateStamp: new Date()
        .toISOString()
        .slice(0, 19)
        .replace('T', ' ')
    }
    upsertUserVideoType(newUserData);
    callSendAPI(sender_psid, response);
  }
}

// Inserts or updates User to database Values Expected: psid, subscriber,
// datestamp Value Types: string, boolean, string Date Stamp
function upsertUser(userData) {
  connection
    .query("INSERT INTO users (psid, subscriber, dateStamp) VALUES ('" + userData.psid + "'," + userData.subscriber + ",'" + userData.dateStamp + "') ON DUPLICATE KEY UPDATE subscriber=" + userData.subscriber + ",dateStamp='" + userData.dateStamp + "';", function (error, results, fields) {
      if (error) 
        throw error;
      }
    );
}

// Inserts or updates User to database Values Expected: psid, videoType,
// datestamp Value Types: string, string, string Date Stamp
function upsertUserVideoType(userData) {
  connection
    .query("INSERT INTO users (psid, videoType, dateStamp) VALUES ('" + userData.psid + "','" + userData.videoType + "','" + userData.dateStamp + "') ON DUPLICATE KEY UPDATE videoType='" + userData.videoType + "',dateStamp='" + userData.dateStamp + "';", function (error, results, fields) {
      if (error) 
        throw error;
      }
    );
}

function callSendAPI(sender_psid, response) {
  // Construct the message body
  let request_body = {
    "recipient": {
      "id": sender_psid
    },
    "message": response
  }

  // Send the HTTP request to the Messenger Platform
  request({
    "uri": "https://graph.facebook.com/v2.6/me/messages",
    "qs": {
      "access_token": PAGE_ACCESS_TOKEN
    },
    "method": "POST",
    "json": request_body
  }, (err, res, body) => {
    if (!err) {
      console.log('message sent!')
    } else {
      console.error("Unable to send message:" + err);
    }
  });
}