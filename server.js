const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const shortid = require('shortid');

const cors = require("cors");

//Setting MongoDB
const mongoose = require("mongoose");
mongoose.connect(process.env.MONGO_URI);
mongoose.set('useFindAndModify', false);
app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

//Defining Schema & Model
let Schema = mongoose.Schema;
let userSchema = new Schema({
  id: {type: String, unique: true, default: shortid.generate},
  user: String,
  exercise:[{
    description: String,
    duration: Number,
    date: {}
  }]
});
let userModel = mongoose.model("Users", userSchema);

let exerciseSchema = new Schema({
  userId: String,
  description: String,
  duration: Number,
  date: String
});
let exerciseModel = mongoose.model("Exercies", exerciseSchema);




//THE POST PROCESS

app.post("/api/exercise/new-user", (req, res) => {
  //getting neccesity
  let userName = req.body.username;
  let userNew = new userModel({ user: userName });
  
  //searching for existing user
  userModel
    .find()
    .exec()
    .then(data => {
      data = data.filter(obj => obj["user"] === userName);
      
      if (data.length === 0) {
        userNew
          .save()
          .then(result => {
            
            res.json({user: result.user, id:result.id,exercise:result.exercise});
          })
          .catch(err => {
            
            res.json({ error: err });
          });
      } else {
        res.json({ Error: "User is already registered in the database" });
      }
    });
});

app.post("/api/exercise/add", (req, res) => {
  
  // checking if new date is entered or not. If not - we create new date.
  let newDate ='';
  if (req.body.date==''){
    newDate = new Date().getFullYear()+'-'+new Date().getMonth()+'-'+new Date().getDate();
  }
  
  //saving new exercise to an object
  let newExercise={
    description: req.body.description,
    duration: req.body.duration,
    date: newDate
  }

  //checking if there is user with shortId
  userModel.findOne({id: req.body.userId})
  .exec()
  .then(data=>{
    if(data==null){
      //user not found - sent the message
      res.json({error: 'Sorry, user with that ID is not found. Please use /api/get/users to find yourself and shortID. Use it then to add exercises'})
    }
    else{
      //user found. push new object to the exercise array and save.
      data.exercise.push(newExercise)
      data.save((err)=>{
        if (err) res.json(err)
      });
    
      // send response to the user
    res.json(data.exercise)
    }
    
  })
 
});

function isValidDate(d) {
  return d instanceof Date && !isNaN(d);
}
// THE GET PROCESS

app.get('/api/exercise/users', (req,res)=>{
  //getting all data from database
  userModel.find().then(data =>{
    if(data!=null){
      let newArr = [];
      //filter eacch user and insert only username and shortId
      data.forEach(e =>{
        
        newArr.push({user: e.user, id: e.id})
      })
      //send newly created array with users to the user who requested
      res.json(newArr)
    }
    else{
      res.json({error: 'there are no users in the database'})
    }
  })
  
})

app.get('/api/exercise/log/:userId', (req,res)=>{
  
  //finding user with ID
  userModel.findOne({id: req.params.userId}, (err,data)=>{
    if (data !=null){
      //if data is not null - create a specific filter
      let results = data.exercise;
      
      let fromDate = new Date(req.query.from);
      let toDate = new Date(req.query.to);
      let limit = Number(req.query.limit);
      
       if (isValidDate(toDate)){
        results = results.filter((item) => (item.date >= fromDate && item.date <= toDate));
      //check if just from defined
      }else if(isValidDate(fromDate)){
        results = results.filter((item)=>(item.date >= fromDate))
      }
      //apply limit if defined and applicable
      if (!isNaN(limit) && results.length > limit){
        results = results.slice(0,limit);
    }
            res.send({"exercise":results});
    }
    else{
      res.json({Error: 'User not found with that ID'})
    }
  })
  
})
// Not found middleware
app.use((req, res, next) => {
  return next({ status: 404, message: "not found" });
});

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage;

  if (err.errors) {
    // mongoose validation error
    errCode = 400; // bad request
    const keys = Object.keys(err.errors);
    // report the first validation error
    errMessage = err.errors[keys[0]].message;
  } else {
    // generic or custom error
    errCode = err.status || 500;
    errMessage = err.message || "Internal Server Error";
  }
  res
    .status(errCode)
    .type("txt")
    .send(errMessage);
});

const listener = app.listen(process.env.PORT || 4000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
