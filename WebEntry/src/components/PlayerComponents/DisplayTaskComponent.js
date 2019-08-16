import React, { Component } from 'react';
import { Link } from 'react-router-dom';

import Button from '@material-ui/core/Button';

//icons
import CancelIcon from '@material-ui/icons/Cancel';
import NavigationIcon from '@material-ui/icons/NavigateNext';

//view components
import InstructionViewComponent from '../Views/InstructionViewComponent';
import TextEntryComponent from '../Views/TextEntryComponent';
import SingleChoiceComponent from '../Views/SingleChoiceComponent';
import MultipleChoiceComponent from '../Views/MultipleChoiceComponent';
import ImageViewComponent from '../Views/ImageViewComponent';

import MultiItemTask from './MultiItemTask';

import wamp from '../../core/wamp';
import store from '../../core/store';
import shuffle from '../../core/shuffle';
import db_helper from '../../core/db_helper';
import * as dbObjects from '../../core/db_objects';
import * as dbObjectsUtilityFunctions from '../../core/db_objects_utility_functions';
import * as playerUtils from '../../core/player_utility_functions';

import './DisplayTaskComponent.css';

 //Helper class to allow recursive endering
class DisplayTaskHelper extends React.Component {
  constructor() {
    super();
    this.state = {
      currentTaskIndex: 0,
      hasBeenAnswered: false,
      complexStep: 0 //for complex tasks only
    }

    this.currentTask = null;
    this.currentLineOfData = null;
    this.handleGazeLocUpdate = this.updateCursorLocation.bind(this);
  }

  componentDidMount() {
    this.timer = setInterval(this.handleGazeLocUpdate, 4.5); //Update the gaze cursor location every 2ms
  }

  componentWillUnmount() {
    clearInterval(this.timer);
  }

  logTheStartOfTask() {
    var startTimestamp = playerUtils.getCurrentTime();
    this.currentLineOfData = new dbObjects.LineOfData(startTimestamp,
                                                      this.currentTask._id,
                                                      this.props.tasksFamilyTree, //the array that has the task's tasksFamilyTree
                                                      dbObjectsUtilityFunctions.getTaskContent(this.currentTask),
                                                      this.currentTask.correctResponses);

    wamp.broadcastEvents(playerUtils.stringifyWAMPMessage(this.currentTask, startTimestamp, "START"));
  }

  //Updates the location of the Gaze Cursor. And checks if any of the AOIs were looked at
  updateCursorLocation(){
    try {
      let gazeLoc = store.getState().gazeData[store.getState().experimentInfo.selectedTracker];
      this.currentTask.aois.map((item, index) => {
        if (gazeLoc.locX > item.boundingbox[0][0] && gazeLoc.locX < item.boundingbox[1][0]
          && gazeLoc.locY > item.boundingbox[0][1] && gazeLoc.locY < item.boundingbox[3][1]
          && item["checked"] === undefined) {
          item["checked"] = true;
        }
      });
    } catch (err) {
    }
  }

  onClickNext() {
    if (this.currentTask && this.currentTask.taskType === "Complex" && this.state.complexStep < 2) {
      this.setState({
        complexStep: (this.state.complexStep + 1)
      })
    }
    else {
      if (!(store.getState().experimentInfo.participantId === "TESTING")) {
        if (this.currentLineOfData) {
          if (!this.currentTask.globalVariable) {
            //complete line of data before saving to DB
            this.currentLineOfData.timeToCompletion = playerUtils.getCurrentTime() - this.currentLineOfData.startTimestamp;
            db_helper.addNewLineToParticipantDB(store.getState().experimentInfo.participantId,
                                                  JSON.stringify(this.currentLineOfData));
          }
          else {
            var globalVariableObj = {
              label: this.currentTask.question,
              value: this.currentLineOfData.responses
            };
            db_helper.addNewGlobalVariableToParticipantDB(store.getState().experimentInfo.participantId,
                                                            JSON.stringify(globalVariableObj));
          }

          wamp.broadcastEvents(playerUtils.stringifyWAMPMessage(this.currentLineOfData, null,
                                                    this.state.hasBeenAnswered ? "NEXT" : "SKIP"));
        }
      }

      //reset state
      this.setState({
        hasBeenAnswered: false,
        answerItem: null,
        currentTaskIndex: (this.state.currentTaskIndex + 1),
        complexStep: 0
      });
      this.currentLineOfData = null;
    }
  }

  onAnswer(answer) {
    if (!this.state.hasBeenAnswered) {
      if (!(store.getState().experimentInfo.participantId === "TESTING")) {
        this.currentLineOfData.firstResponseTimestamp = playerUtils.getCurrentTime();
        this.currentLineOfData.timeToFirstAnswer = this.currentLineOfData.firstResponseTimestamp - this.currentLineOfData.startTimestamp;
      }
    }
    this.setState({
      hasBeenAnswered: true
    });
    if (!(store.getState().experimentInfo.participantId === "TESTING")) {
      this.currentLineOfData.responses = answer.responses;
      this.currentLineOfData.correctlyAnswered = answer.correctlyAnswered;
    }
  }

  onFinishedRecursion() {
    this.onClickNext();
  }

  render() {
    //check if we should enter a new level or leave
    if(this.props.taskSet.length > 0 && this.state.currentTaskIndex < this.props.taskSet.length) {
      if (this.props.taskSet[this.state.currentTaskIndex].objType === "TaskSet") {

        console.log(this.props.taskSet[this.state.currentTaskIndex]);
        //shuffle set if set was marked as "Random"
        var runThisTaskSet = this.props.taskSet[this.state.currentTaskIndex].data;
        if (this.props.taskSet[this.state.currentTaskIndex].setTaskOrder === "Random") {
          runThisTaskSet = shuffle(runThisTaskSet);
        }

        let updatedTaskSet = this.props.taskSet[this.state.currentTaskIndex];
        updatedTaskSet.data = runThisTaskSet;

        let trackingTaskSetNames = this.props.tasksFamilyTree.slice(); //clone array, since javascript passes by reference, we need to keep the orgin familyTree untouched
        trackingTaskSetNames.push(this.props.taskSet[this.state.currentTaskIndex].name);

        if(this.props.taskSet[this.state.currentTaskIndex].displayOnePage){
          return <MultiItemTask tasksFamilyTree={trackingTaskSetNames} taskSet={runThisTaskSet} onFinished={this.onFinishedRecursion.bind(this)}/>
        } else{
          //recursion
          return <DisplayTaskHelper tasksFamilyTree={trackingTaskSetNames} taskSet={runThisTaskSet} onFinished={this.onFinishedRecursion.bind(this)}/>
        }
      }
      //TODO: this is a go around solution, please fix it to make it solid
      else {//if (this.props.taskSet[this.state.currentTaskIndex].objType === "Task" || ) {
        this.currentTask = this.props.taskSet[this.state.currentTaskIndex].data;
        if (this.currentTask === undefined) {
          //console.log("bug in the database, set the task to the correct data");
          this.currentTask = this.props.taskSet[this.state.currentTaskIndex];
        }

        //log the start
        if (!this.state.hasBeenAnswered && this.state.complexStep === 0
              && !(store.getState().experimentInfo.participantId === "TESTING")) {
          this.logTheStartOfTask();
        }

        var getDisplayedContent = () => {
          if(this.currentTask){
            if((this.currentTask.taskType === "Instruction") ||
                  (this.currentTask.taskType === "Complex" && this.state.complexStep === 0)) {
                return <InstructionViewComponent task={this.currentTask} answerCallback={this.onAnswer.bind(this)}/>;
              }
            if(this.currentTask.taskType === "Text Entry") {
                return <TextEntryComponent task={this.currentTask} answerCallback={this.onAnswer.bind(this)} answerItem={this.state.answerItem} hasBeenAnswered={this.state.hasBeenAnswered}/>;
              }
            if(this.currentTask.taskType === "Single Choice") {
                return <SingleChoiceComponent task={this.currentTask} answerCallback={this.onAnswer.bind(this)} answerItem={this.state.answerItem} hasBeenAnswered={this.state.hasBeenAnswered}/>;
              }
            if((this.currentTask.taskType === "Multiple Choice") ||
                  (this.currentTask.taskType === "Complex" && this.state.complexStep === 2)) {
                return <MultipleChoiceComponent task={this.currentTask} answerCallback={this.onAnswer.bind(this)} answerItem={this.state.answerItem} hasBeenAnswered={this.state.hasBeenAnswered}/>;
              }
            if((this.currentTask.taskType === "Image") ||
                  (this.currentTask.taskType === "Complex" && this.state.complexStep === 1)) {
                return <ImageViewComponent task={this.currentTask}/>;
              }
          } else {

            return <div/>;
          }
        };

        var nextButtonText = this.state.hasBeenAnswered ? "Next" : "Skip";

        return (
          <div className="page">
            <div className="mainDisplay">
              {getDisplayedContent()}
            </div>
            <div className="nextButton">
              <Button className="nextButton" variant="outlined" onClick={this.onClickNext.bind(this)}>
                {nextButtonText}
              </Button>
            </div>
          </div>
          );
      }

    }
    else { //TODO: end of set
      this.props.onFinished();
      // console.log("end of set");
      return (<div/>);
    }
  }
}

class DisplayTaskComponent extends Component {
  broadcastStartEvent() {
    var dt = new Date();
    var timestamp = dt.toUTCString();

    var info = ["NEW EXPERIMENT",
                store.getState().experimentInfo.mainTaskSetId,
                timestamp]
    wamp.broadcastEvents(info);
  }
  broadcastEndEvent() {
    var dt = new Date();
    var timestamp = dt.toUTCString();

    var info = ["FINISHED",
                store.getState().experimentInfo.mainTaskSetId,
                timestamp]
    wamp.broadcastEvents(info);
  }

  componentWillMount() {
    this.broadcastStartEvent();

    var layoutAction = {
      type: 'SET_SHOW_HEADER',
      showHeader: false,
      showFooter: false
    }

    store.dispatch(layoutAction);
  }

  componentWillUnmount() {
    var layoutAction = {
      type: 'SET_SHOW_HEADER',
      showHeader: true,
      showFooter: true
    }

    store.dispatch(layoutAction);
  }

  onFinished() {
    this.broadcastEndEvent();
    this.props.history.goBack();
    alert("finished!");
  }

  render() {
    var renderObj = null;
    if(store.getState().experimentInfo.selectedTaskSetObject.displayOnePage){
      renderObj = <MultiItemTask tasksFamilyTree={[store.getState().experimentInfo.mainTaskSetId]} taskSet={store.getState().experimentInfo.taskSet} onFinished={this.onFinished.bind(this)}/>;
    }
    else{
      renderObj = <DisplayTaskHelper tasksFamilyTree={[store.getState().experimentInfo.mainTaskSetId]} taskSet={store.getState().experimentInfo.taskSet} onFinished={this.onFinished.bind(this)}/>;
    }

    return (
        renderObj
    );
  }
}

export default DisplayTaskComponent;
