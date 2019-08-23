const mongoose = require("mongoose");
const express = require("express");
const bodyParser = require("body-parser");
const logger = require("morgan");
const fs = require("fs");
//var ObjectID = require('mongodb').ObjectID;


const dataSchema = require("./data_schema");
const Tasks = dataSchema.Tasks;
Tasks.createIndexes({queryString: "text", tags: "text"});
const TaskSets = dataSchema.TaskSets;
TaskSets.createIndexes({queryString: "text", tags: "text"});
const Participants = dataSchema.Participants;
Participants.createIndexes({queryString: "text", tags: "text"});
const Experiments = dataSchema.Experiments;
Experiments.createIndexes({queryString: "text", tags: "text"});

const data_exportation = require("./data_exportation");

const API_PORT = 3001;
const app = express();
const router = express.Router();

var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost:27017/webEntryDb";

MongoClient.connect(url, { useNewUrlParser: true }, function(err, db) {
  if (err) throw err;
  console.log("Database created!");
  db.close();
});

// this is our MongoDB database
const dbRoute = url;

// connects our back end code with the database
mongoose.connect(
  dbRoute,
  { useNewUrlParser: true }
);

let db = mongoose.connection;

db.once("open", () => console.log("connected to the database"));

// checks if connection with the database is successful
db.on("error", console.error.bind(console, "MongoDB connection error:"));

// (optional) only made for logging and
// bodyParser, parses the request body to be a readable json format
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(logger("dev"));

/*
██████   █████  ████████  █████      ███████ ██   ██ ██████   ██████  ██████  ████████  █████  ████████ ██  ██████  ███    ██
██   ██ ██   ██    ██    ██   ██     ██       ██ ██  ██   ██ ██    ██ ██   ██    ██    ██   ██    ██    ██ ██    ██ ████   ██
██   ██ ███████    ██    ███████     █████     ███   ██████  ██    ██ ██████     ██    ███████    ██    ██ ██    ██ ██ ██  ██
██   ██ ██   ██    ██    ██   ██     ██       ██ ██  ██      ██    ██ ██   ██    ██    ██   ██    ██    ██ ██    ██ ██  ██ ██
██████  ██   ██    ██    ██   ██     ███████ ██   ██ ██       ██████  ██   ██    ██    ██   ██    ██    ██  ██████  ██   ████
*/
router.post("/exportToCSV", (req, res) => {
  const { data } = req.body;
  var obj = JSON.parse(data);
  data_exportation.save_to_csv(obj);
});

router.post("/exportAllToCSVs", (req, res) => {
  Participants.find((err, data) => {
    if (err) {
      return res.json({ success: false, error: err });
    }
    data.map((p, index) => {
      data_exportation.save_to_csv(p);
    });
    return res.json({ success: true});
  });

})
/*
████████  █████  ███████ ██   ██ ███████
   ██    ██   ██ ██      ██  ██  ██
   ██    ███████ ███████ █████   ███████
   ██    ██   ██      ██ ██  ██       ██
   ██    ██   ██ ███████ ██   ██ ███████
*/


 // this method fetches all available questions in our database
router.get("/getAllTasks", (req, res) => {
  Tasks.find((err, data) => {
    if (err) {
      return res.json({ success: false, error: err });
    }
    return res.json({ success: true, questions: data });
  });
});

router.post("/getTaskWithID", (req, res) => {
  const { id } = req.body;
  Tasks.findOne({_id: id}, (err, obj) => {
    if (err) {
      return res.json({success: false, error: err});
    }
    console.log(err, obj);
    return res.json({success: true, question: obj});
  });
});

router.post("/getAllTasksContaining", (req, res) => {
  const { queryCollection, queryString } = req.body;

  var collection = null;
  if(queryCollection === 'Tasks'){
    collection = Tasks;
  }
  else{
    collection = TaskSets;
  }

  collection.find( {$or:[{'question': {"$regex" : queryString, "$options":"i"}},
  {'name': {"$regex" : queryString, "$options":"i"}},
  {'tags': {"$regex" : queryString, "$options":"i"}}]}, (err, data) => {
    if (err) {
      console.log(err);
      return res.json({success: false, error: err});
    }

    return res.json({success: true, tasks: data});
  });
});

// this method adds new question in our database
router.post("/addTask", (req, res) => {
  const { message } = req.body;
  var obj = JSON.parse(message);
  console.log("received obj", obj);
  let task = new Tasks(obj);

  task.save((err, q) => {
    if (err) {
      return res.json({ success: false, error: err });
    }
    return res.json({ success: true, _id: q._id });
  });
});

// this method modifies existing question in our database
router.post("/updateTask", (req, res) => {
  const { id, message } = req.body;
  var obj = JSON.parse(message);
  Tasks.findOneAndUpdate({_id: id}, obj, err => {
    if (err) return res.json({ success: false, error: err });
    return res.json({ success: true });
  });
});

// this method deletes existing question in our database
router.post("/deleteTask", (req, res) => {
  const { id } = req.body;

  TaskSets.updateMany({ }, { $pull: {childIds: {id: id}}}, err => {

  })
  Tasks.findOneAndDelete({_id: id}, err => {
    if (err) return res.send(err);
    return res.json({ success: true });
  });

  //remove this question from all sets

});

router.delete("/deleteAllTasks", (req, res) => {
  Tasks.deleteMany({}, err => {
    if (err) return res.send(err);
    return res.json({ success: true });
  });
});

/*
███████ ███████ ████████
██      ██         ██
███████ █████      ██
     ██ ██         ██
███████ ███████    ██
*/

router.get("/getAllTaskSets", (req, res) => {
  TaskSets.find((err, data) => {
    if (err) {
      return res.json({ success: false, error: err });
    }
    return res.json({ success: true, sets: data });
  });
});

router.post("/getTaskSetWithID", (req, res) => {
  const { id } = req.body;
  TaskSets.findOne({_id: id}, (err, obj) => {
    if (err) {
      return res.json({success: false, error: err});
    }

    return res.json({success: true, set: obj});
  });
});

router.post("/addTaskSet", (req, res) => {
  const { id, message } = req.body;
  var obj = JSON.parse(message);
  let set = new TaskSets(obj);

  set.save((err, s) => {
    if (err) {
      return res.json({ success: false, error: err });
    }
    return res.json({ success: true, _id: s._id });
  });
});

// this method modifies existing question in our database
router.post("/updateTaskSet", (req, res) => {
  const { id, message } = req.body;
  var obj = JSON.parse(message);
  TaskSets.findOneAndUpdate({_id: id}, obj, err => {
    if (err) return res.json({ success: false, error: err });
    return res.json({ success: true });
  });
});

// this method deletes existing question in our database
router.post("/deleteTaskSet", (req, res) => {
  const { id } = req.body;
  TaskSets.findOneAndDelete({_id: id}, err => {
    if (err) return res.send(err);
    return res.json({ success: true });
  });
});

router.post("/addChildToTaskSet", (req, res) => {
  const { setId, childObj} = req.body;
  TaskSets.updateOne({_id: setId}, { $addToSet: {childIds: childObj}}, err => {
    if (err) return res.json({ success: false, error: err });
    return res.json({ success: true });
  });
});

router.post("/removeChildFromTaskSetDb", (req, res) => {
  const { setId, childId } = req.body;
  TaskSets.updateOne({_id: setId}, { $pull: {childIds: {id: childId}}}, err => {
    if (err) return res.json({ success: false, error: err });
    return res.json({ success: true });
  })
});

router.delete("/deleteAllTaskSets", (req, res) => {
  TaskSets.deleteMany({}, err => {
    if (err) return res.send(err);
    return res.json({ success: true });
  });
});

router.post("/getCompleteTaskSetObject", async (req, res) => {
  const { objId } = req.body;
  const id = JSON.parse(objId);

  var recursion = async function(target) {
    if (target.objType === "Task") {
      var taskFromDb = await Tasks.findOne({_id: target.id}, async (err, task) => {
        return task;
      });

      return taskFromDb;
    }
    else if (target.objType === "TaskSet") {
      var setData = await TaskSets.findOne({_id: target.id}, async (err, obj) => {
        return obj;
      });

      var childs = setData.childIds.map(async item => {
        var data = await recursion(item);
        return data;
      });

      var childrenData = await Promise.all(childs);

      //For some reason the resulting javascript object has a lot of unecessary information so I only extract what we need
      var setCleanedData = setData._doc;
      setCleanedData.data = childrenData;
      return setCleanedData;
    }
  }

  var target = {objType: "TaskSet", id: id};
  const result = await recursion(target);
  return res.json({success: true, data: result});
});

router.post("/getTasksOrTaskSetsWithIDs", async (req, res) => {
  const { wrapperSetJson } = req.body;
  var wrapperSet = JSON.parse(wrapperSetJson);
  const ids = wrapperSet.childIds;

  var count = 0;

  var recursionForArray = async function(targetArray) {
    const childs = targetArray.map(async item => {
      const dat = await recursion(item);
      return dat;
    });
    const temp = await Promise.all(childs);
    return temp;
  }

  var recursion = async function(target) {
    if (target.objType === "Task") {
      var taskFromDb = await Tasks.findOne({_id: target.id}, async (err, task) => {
        count = count + 1;
        return task;
      });

      return taskFromDb;
    }
    else if (target.objType === "TaskSet") {
      var setData = await TaskSets.findOne({_id: target.id}, async (err, obj) => {
        return obj;
      });

      var childs = setData.childIds.map(async item => {
        var data = await recursion(item);
        return data;
      });
      // if (setData.displayOnePage) {
      //   count = count - setData.childIds.length + 1;
      // }

      var childrenData = await Promise.all(childs);

      //For some reason the resulting javascript object has a lot of unecessary information so I only extract what we need
      var setCleanedData = setData._doc;
      setCleanedData.data = childrenData;
      return setCleanedData;
    }
  }

  const results = await recursionForArray(ids);
  wrapperSet.data = results;
  return res.json({success: true, data: wrapperSet, count: count});
});

router.post("/getImage", (req, res) => {
  const { file } = req.body;
  var filepath = "../public/Images/" + file;
  console.log("received request for image:", filepath);
  fs.readFile(filepath, (err, data) => {
    if (err) {
      return res.json({ success: false, error: err});
    }

    //get image file extension name
    let extensionName = file.split('.')[1];

    //convert image file to base64-encoded string
    let base64Image = new Buffer(data, 'binary').toString('base64');

    //combine all strings
    let imgSrcString = `data:image/${extensionName};base64,${base64Image}`;

    // res.contentType('json');
    return res.json({ success: true, data: imgSrcString});
  })
});

/*
██████   █████  ██████  ████████ ██  ██████ ██ ██████   █████  ███    ██ ████████ ███████
██   ██ ██   ██ ██   ██    ██    ██ ██      ██ ██   ██ ██   ██ ████   ██    ██    ██
██████  ███████ ██████     ██    ██ ██      ██ ██████  ███████ ██ ██  ██    ██    ███████
██      ██   ██ ██   ██    ██    ██ ██      ██ ██      ██   ██ ██  ██ ██    ██         ██
██      ██   ██ ██   ██    ██    ██  ██████ ██ ██      ██   ██ ██   ████    ██    ███████
*/


router.get("/getAllParticipants", (req, res) => {
  Participants.find((err, data) => {
    if (err) {
      return res.json({ success: false, error: err });
    }
    return res.json({ success: true, participants: data });
  });
});

router.post("/getParticipantWithID", (req, res) => {
  const { id } = req.body;
  Participants.findOne({_id: id}, (err, obj) => {
    if (err) {
      return res.json({success: false, error: err});
    }

    return res.json({success: true, participant: obj});
  });
});

router.post("/getParticipantsWithIDs", (req, res) => {
  const { ids } = req.body;
  count = 0;
  len = ids.length;
  Participants.find({
      '_id': { $in: ids}
  }, function(err, objs){
       return res.json({success: true, participants: objs});
  });
});

// this method adds new participant (or log a new run) into our database
router.post("/addParticipant", (req, res) => {
  const { message } = req.body;
  var obj = JSON.parse(message);
  let participant = new Participants(obj);

  participant.save((err, p) => {
    if (err) {
      return res.json({ success: false, error: err });
    }
    return res.json({ success: true, _id: p._id });
  });
});

router.post("/updateParticipant", (req, res) => {
  const { id, message } = req.body;
  var obj = JSON.parse(message);
  Participants.findOneAndUpdate({_id: id}, obj, err => {
    if (err) return res.json({ success: false, error: err });
    return res.json({ success: true });
  });
});

router.post("/addNewLineToParticipant", (req, res) => {
  const { participantId, newLineJSON} = req.body;
  var newLine = JSON.parse(newLineJSON);
  Participants.updateOne({_id: participantId}, { $addToSet: {linesOfData: newLine}}, err => {
    if (err) return res.json({ success: false, error: err });
    return res.json({ success: true });
  });
});

router.post("/addNewGlobalVariableToParticipant", (req, res) => {
  const { participantId, globalVariableJSON} = req.body;
  var globalVariable = JSON.parse(globalVariableJSON);

  Participants.updateOne({_id: participantId}, { $addToSet: {globalVariables: globalVariable}}, err => {
    if (err) return res.json({ success: false, error: err });
    return res.json({ success: true });
  });
});

router.post("/deleteParticipant", (req, res) => {
  const { id } = req.body;

  Experiments.updateOne({ childIds: id }, { $pull: {childIds: id}}, err => {

  })
  Participants.findOneAndDelete({_id: id}, err => {
    if (err) return res.send(err);
    return res.json({ success: true });
  });
});

router.delete("/deleteAllParticipants", (req, res) => {
  Participants.deleteMany({}, err => {
    if (err) return res.send(err);
    return res.json({ success: true });
  });
});

/*
███████ ██   ██ ██████  ███████ ██████  ██ ███    ███ ███████ ███    ██ ████████ ███████
██       ██ ██  ██   ██ ██      ██   ██ ██ ████  ████ ██      ████   ██    ██    ██
█████     ███   ██████  █████   ██████  ██ ██ ████ ██ █████   ██ ██  ██    ██    ███████
██       ██ ██  ██      ██      ██   ██ ██ ██  ██  ██ ██      ██  ██ ██    ██         ██
███████ ██   ██ ██      ███████ ██   ██ ██ ██      ██ ███████ ██   ████    ██    ███████
*/


router.get("/getAllExperiments", (req, res) => {
  Experiments.find((err, data) => {
    if (err) {
      return res.json({ success: false, error: err });
    }
    return res.json({ success: true, experiments: data });
  });
});

router.post("/getExperimentWithID", (req, res) => {
  const { id } = req.body;
  Experiments.findOne({_id: id}, (err, obj) => {
    if (err) {
      return res.json({success: false, error: err});
    }
    return res.json({success: true, experiments: obj});
  });
});

router.post("/addExperiment", (req, res) => {
  const { id, message } = req.body;
  var obj = JSON.parse(message);
  let experiment = new Experiments(obj);

  experiment.save((err, s) => {
    if (err) {
      return res.json({ success: false, error: err });
    }
    return res.json({ success: true, _id: s._id });
  });
});

router.post("/updateExperiment", (req, res) => {
  const { id, message } = req.body;
  var obj = JSON.parse(message);
  Experiments.findOneAndUpdate({_id: id}, obj, err => {
    if (err) return res.json({ success: false, error: err });
    return res.json({ success: true });
  });
});

router.post("/addParticipantToExperiment", (req, res) => {
  const { experimentId, participantId} = req.body;
  Experiments.updateOne({_id: experimentId}, { $addToSet: {participantIds: participantId}}, err => {
    if (err) return res.json({ success: false, error: err });
    return res.json({ success: true });
  });
});

router.post("/removeParticipantFromExperiment", (req, res) => {
  const { experimentId, participantId } = req.body;
  Experiments.updateOne({_id: experimentId}, { $pull: {participantIds: participantId}}, err => {
    if (err) return res.json({ success: false, error: err });
    return res.json({ success: true });
  })
});

router.post("/deleteExperiment", (req, res) => {
  const { id } = req.body;
  Experiments.findOneAndDelete({_id: id}, err => {
    if (err) return res.send(err);
    return res.json({ success: true });
  });
});

router.delete("/deleteAllExperiments", (req, res) => {
  Experiments.deleteMany({}, err => {
    if (err) return res.send(err);
    return res.json({ success: true });
  });
});

// append /api for our http requests
app.use("/api", router);

// launch our backend into a port
app.listen(API_PORT, () => console.log(`LISTENING ON PORT ${API_PORT}`));
