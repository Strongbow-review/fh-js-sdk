module.exports = applyServer;

var fileHandler = require('fs');
var getFormsData = require("./sampleData/getForms.json");
var allForms = require("./sampleData/getForm.json");
var theme = require("./sampleData/getTheme.json");
var config = require("./sampleData/getConfig.json");
var submissionFile = require("./sampleData/submissionFile.json");
var submissionData = require("./sampleData/submissionData.json");
var submissionStatusFileHash = "";
var failedFileUploadFileHash = "";
var submissionStatusCounter = 0;
var testPhoto = __dirname+"/sampleData/testPhoto.jpg";
var testFile = __dirname+"/sampleData/testFile.pdf";
var responseDelay = 100;

function applyServer(app) {
  app.use(function(req, res, next) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "X-Request-With, Content-Type");
    next();
  });
  app.get("/mbaas/forms/:appId/theme", _getTheme);
  app.get("/mbaas/forms/:appid/config/:deviceId", _getConfig);
  app.get("/mbaas/forms/:appId", _getForms);
  app.get("/mbaas/forms/:appId/submission/:submissionId", _getSubmissionData);
  app.get("/mbaas/forms/:appId/submission/:submissionId/file/:fileId", _getSubmissionFile);

  app.get("/mbaas/forms/:appId/:formId", _getForm);
  app.post("/mbaas/forms/:appId", _postForms);
  app.post("/box/srv/1.1/app/init", _postInit);
  app.post("/mbaas/forms/:appId/:formId/submitFormData", _postFormSubmission);
  app.post("/mbaas/forms/:appId/:submissionId/:fieldId/:hashName/submitFormFile", _appFileSubmission);
  app.post("/mbaas/forms/:appId/:submissionId/:fieldId/:hashName/submitFormFileBase64", _appFileSubmissionBase64);
  app.get("/mbaas/forms/:appId/:submissionId/status", _getSubmissionStatus);
  app.post("/mbaas/forms/:appId/:submissionId/completeSubmission", _completeSubmission);
  app.get("/sys/info/ping", _ping);
};

function _ping(req, res){
  console.log("In _ping, ", req.params);
  res.end("OK");
}

function _getConfig(req, res){
  console.log("In _getConfig, ", req.params);

  res.json(config);
};


function _getSubmissionData(req, res){
  console.log("In _getSubmissionData", req.params);
  var retVal = {};

  if(req.params.submissionId === "submissionData"){
    retVal = submissionData;
  } else if(req.params.submissionId === "submissionFile"){
    retVal = submissionFile;
  } else {   //If it is not either of these, send back an error
    retVal = {error: "No submission matches id: "+ req.params.submissionId }
  }
  res.json(retVal);
};

function _getSubmissionFile(req, res){
  console.log("In _getSubmissionData", req.params);
  var fileToRead = req.params.fileId === "photo" ? testPhoto : testFile;


  var fileStream = fileHandler.createReadStream(fileToRead);

  fileStream.pipe(res);
};

function _postInit(req, res) {
  console.log("In _postInit, ", req.params);
  res.json({
    "status": "ok",
    "hosts":{
      "url": ""
    }
  });
}

function _getForms(req, res) {
  console.log("In _getForms, ", req.params);
  res.json(getFormsData);
}

function _postForms(req, res) {
  console.log("In _postForms, ");

  setTimeout(function() {
    res.json({
      "status": "ok",
      "body": req.body
    });
  }, responseDelay);
}

function _getSubmissionStatus(req, res) {
  console.log("In _getSubmissionStatus, ", req.params);

  var responseJSON = {
    "status": "complete"
  };

  if (req.params.submissionId === "submissionStatus") {
    if (submissionStatusCounter == 0) {
      responseJSON = {
        "status": "pending",
        "pendingFiles": [submissionStatusFileHash]
      };
      submissionStatusCounter++;
    } else {
      responseJSON = {
        "status": "complete"
      };
    }
  } else if (req.params.submissionId === "failedFileUpload") {
    responseJSON = {
      "status": "pending",
      "pendingFiles": [failedFileUploadFileHash]
    }
  } else if (req.params.submissionId === "submissionError") {
    responseJSON = {
      "status": "pending",
      "pendingFiles": ["filePlaceHolder123456"]
    }
  }

  setTimeout(function() {
    res.json(responseJSON);
  }, responseDelay);

}

function _completeSubmission(req, res) {
  console.log("In _completeSubmission, ", req.params);
  var resJSON = {
    "status": "complete"
  };
  if (req.params.submissionId === "submissionNotComplete") {
    resJSON = {
      "status": "pending",
      "pendingFiles": ["filePlaceHolder123456"]
    };
  } else if (req.params.submissionId === "submissionError") {
    resJSON = {
      "status": "error"
    };
  } else if (req.params.submissionId == "submissionStatus") {
    submissionStatusFileHash = "";
    submissionStatusCounter = 0;
  }
  console.log(resJSON);
  setTimeout(function() {
    res.json(resJSON);
  }, responseDelay);

}

function _postFormSubmission(req, res) {
  console.log("In _postFormSubmission, ", req.params);

  var submissionId = "123456";

  var body = req.body;
  console.log(body);

  if (body.testText === "failedFileUpload") {
    submissionId = "failedFileUpload"
  } else if (body.testText === "submissionNotComplete") {
    submissionId = "submissionNotComplete"
  } else if (body.testText === "submissionError") {
    submissionId = "submissionError"
  } else if (body.testText === "submissionStatus") {
    submissionId = "submissionStatus";
  } else {
    submissionId = Math.floor((Math.random() * 1000) + 1).toString();
  }

  var body = req.body;
  var rtn = {
    "submissionId": submissionId,
    "ori": body
  };
  if (body.outOfDate) {
    rtn.updatedFormDefinition = allForms['52efeb30538082e229000002'];
  }
  setTimeout(function() {
    console.log("Returning: ", body.testText);
    console.log("submissionId: ", submissionId);
    res.json(rtn);
  }, responseDelay);

}

function _getForm(req, res) {
  console.log("In _getForm, ", req.params);
  var formId = req.params.formId;

  if (allForms[formId]) {
    console.log("Form Found");
    res.json(allForms[formId]);
  } else {
    res.status(404).end("Cannot find specified form");
  }
}

function _appFileSubmissionBase64(req, res) {
  console.log('In base64FileUploaded');

  _appFileSubmission(req, res);
}

function _appFileSubmission(req, res) {
  console.log("In _appFileSubmission", req.files, req.params);
  var resJSON = {
    "status": 200
  };

  if (req.params.submissionId === "failedFileUpload") {
    resJSON = {
      "status": "error"
    };
    failedFileUploadFileHash = req.params.hashName;
  } else if (req.params.submissionId == "submissionStatus") {
    console.log(submissionStatusCounter);
    if (submissionStatusCounter === 0) {
      resJSON = {
        "status": "error"
      };
      submissionStatusFileHash = req.params.hashName;
    } else {
      resJSON = {
        "status": "ok"
      };
    }
    submissionStatusCounter = 0;
  } else if (req.params.submissionId == "submissionError") {
    resJSON = {
      "status": "error"
    };
    submissionStatusFileHash = req.params.hashName;
  }
  console.log(resJSON, req.params.submissionId);
  setTimeout(function() {
    res.json(resJSON);
  }, responseDelay);
}

function _getTheme(req, res) {
  console.log("In _getTheme, ", req.params);
  res.json(theme);
}