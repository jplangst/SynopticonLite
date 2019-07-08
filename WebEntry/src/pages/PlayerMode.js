import React, { Component } from 'react';

import Button from '@material-ui/core/Button';

//icons
import NavigationIcon from '@material-ui/icons/NavigateNext';
import TextField from '@material-ui/core/TextField';

import FormControl from '@material-ui/core/FormControl';
import InputLabel from '@material-ui/core/InputLabel';
import Select from '@material-ui/core/Select';
import MenuItem from '@material-ui/core/MenuItem';
import FilledInput from '@material-ui/core/FilledInput';

import TaskListComponent from '../components/TaskList/TaskListComponent';

import store from '../core/store';
import shuffle from '../core/shuffle';

import * as dbFunctions from '../core/db_helper.js';
import * as dbObjects from '../core/db_objects';
import './PlayerMode.css';

class PlayerMode extends Component {
  constructor() {
    super();

    this.state = {
      selectedTaskSet: null,
      selectedTracker: '',
      taskSets: []
    }

    //Database callbacks
    this.dbTaskSetCallback = this.dbTaskSetCallbackFunction.bind(this);
    this.dbTasksCallback = this.dbTasksCallbackFunction.bind(this);
  }

  componentWillMount() {
    //dbFunctions.deleteAllParticipantsFromDb();
    //save data into DB before closing
    dbFunctions.getAllParticipantsFromDb((participants) => {
      console.log("all participants", participants);
    });
    dbFunctions.queryTasksFromDb(false, "experiment", this.dbTaskSetCallback);
  }

  //query all tasksets with experiment tag
  dbTaskSetCallbackFunction(queryTasks, data) {
    this.setState({taskSets: data.tasks});
  }

  dbTasksCallbackFunction(dbQueryResult) {
    console.log("db returned", dbQueryResult);
    var runThisTaskSet = dbQueryResult;
    if (this.state.selectedTaskSet.setTaskOrder === "Random") {
      runThisTaskSet = shuffle(runThisTaskSet);
    }

    dbFunctions.addParticipantToDb(new dbObjects.ParticipantObject(this.state.selectedTaskSet._id), (returnedIdFromDB)=> {
      var action = {
        type: 'SET_EXPERIMENT_INFO',
        experimentInfo: {
          experimentId: "",
          participantId: returnedIdFromDB,
          mainTaskSetId: this.state.selectedTaskSet.name,
          taskSet: runThisTaskSet,
          selectedTracker: this.state.selectedTracker
        }
      }

      store.dispatch(action);

      var layourAction = {
        type: 'SET_SHOW_HEADER',
        showHeader: false
      }

      store.dispatch(layourAction);

      this.props.history.push('/RunTasksMode');
    })
  }

  onSelectTaskSet(taskSet) {
    this.setState({selectedTaskSet: taskSet});
  }

  //bottom button handler
  onPlayButtonClick() {
    console.log("call db on this list", this.state.selectedTaskSet.childIds);
    dbFunctions.getTasksOrTaskSetsWithIDs(this.state.selectedTaskSet.childIds, this.dbTasksCallback);
  }

  render() {
    return (
      <div className="page">
        <FormControl className="textinput">
          <InputLabel htmlFor="age-simple">Remote Eye Tracker</InputLabel>
          <Select
            value={this.state.selectedTracker}
            input={<FilledInput name="selectedTracker" id="selectedTracker-helper" />}
          >
            {
              store.getState().remoteEyeTrackers.map((item, index) => {
                return <MenuItem value={item} id={index}>{item}</MenuItem>
              })
            }
          </Select>
        </FormControl>
        < TaskListComponent selectedTask={this.state.selectedTaskSet} reorderDisabled={true} reorderID="tasksReorder" taskList={ this.state.taskSets } selectTask={ this.onSelectTaskSet.bind(this) } editable={false}/ >
        <div className="playButtonWrapper">
          <Button onClick={this.onPlayButtonClick.bind(this)}
                  className="playButton" disabled={(!this.state.selectedTaskSet)}>
            <NavigationIcon fontSize="large"/>
          </Button>
        </div>
        <div className="footer">
        </div>
      </div>
      );
  }
}

export default PlayerMode;
