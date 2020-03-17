import React, { Component } from 'react';

import db_helper from '../../core/db_helper';
import * as dbObjects from '../../core/db_objects';
import * as db_utils from '../../core/db_objects_utility_functions';

import store from '../../core/store';

import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';

import Checkbox from '@material-ui/core/Checkbox';
import FormControlLabel from '@material-ui/core/FormControlLabel';

import SynquestitaskTypeList from '../TaskList/SynquestitaskTypeList';
import SynquestitaskList from '../TaskList/SynquestitaskList';

import { Typography } from '@material-ui/core';

import { Droppable, DragDropContext } from 'react-beautiful-dnd';

import './EditSynquestitaskComponent.css';

class EditSynquestitaskComponent extends Component {
  constructor(props){
    super(props);

    //If we got a taskObject passed as a prop we use it, otherwise we init with a default constructed object
    //Clone the array via JSON. Otherwise we would operate directly on the original objects which we do not want
    this.synquestitask = this.props.isEditing ? JSON.parse(JSON.stringify(this.props.synquestitask)) : new dbObjects.SynquestitaskObject();

    //let childOpenStatus = this.synquestitask.childObj.slice();
    //childOpenStatus.fill(true,0,this.synquestitask.childObj.length);

    this.synquestitask.childObj.forEach(function (child) {
      child.openState = true;
    });

    //We keep these fields in the state as they affect how the component is rendered
    this.state = {
      taskComponents: this.synquestitask.childObj,
      //childOpenStatus: childOpenStatus,
      globalVariable: this.synquestitask.globalVariable,
    };

    this.updateChildOpenStateCallback = this.updateChildOpenState.bind(this);

    this.removeComponentCallback = this.removeComponent.bind(this);
    this.moveComponentCallback = this.moveComponent.bind(this);

    this.responseHandler = this.onResponsesChanged;
    this.handleDBCallback = this.onDBCallback.bind(this);

    this.handleGlobalVariableChanged = this.onGlobalVariableChanged.bind(this);

    //Used to determine if the object should be closed
    this.shouldCloseAsset = false;
  }

  //Callback from the collapsable container when it's state is changed
  updateChildOpenState(childIndex, newState){

    var updatedComponents = this.state.taskComponents.slice();
    updatedComponents[childIndex].openState = newState;
    this.setState({
      taskComponents: updatedComponents
    });
  }

  onDBCallback(synquestitaskID){
    if(this.shouldReopen){
      this.shouldReopen = false;
      var editSynquestitaskAction = {
        type: 'SET_SHOULD_EDIT',
        shouldEdit: true,
        objectToEdit:{...this.synquestitask,...{_id:synquestitaskID}},
        typeToEdit:'synquestitask'
      };
      store.dispatch(editSynquestitaskAction);
    }

    this.closeSetComponent(true, this.shouldCloseAsset);
  }

  onChangeTaskSettings(){
    if(this.props.isEditing){
      this.shouldCloseAsset = false;
      db_helper.updateTaskFromDb(this.synquestitask._id, this.synquestitask, false, this.handleDBCallback)
      let snackbarAction = {
        type: 'TOAST_SNACKBAR_MESSAGE',
        snackbarOpen: true,
        snackbarMessage: "Task saved"
      };
      store.dispatch(snackbarAction);
    }
    else{
      this.shouldCloseAsset = true;
      this.shouldReopen = true;
      db_helper.addTaskToDb(this.synquestitask, false, this.handleDBCallback);
      let snackbarAction = {
        type: 'TOAST_SNACKBAR_MESSAGE',
        snackbarOpen: true,
        snackbarMessage: "Task created"
      };
      store.dispatch(snackbarAction);
    }
  }

  onResponsesChanged(e, response, target){
    response = response.replace(/\s+/g, " ");
    response = response.trim();
    response = response.split(",");
    response = response.map((value)=>{
      return value.trim();
    });
    response = response.filter(Boolean); //Remove empty values

    if(target==="Tags"){
      this.synquestitask.tags = response;
    }
  }

  //Add a task to the list of tasks in the set
  addComponent(sourceIndex, destinationIndex){
    var droppedType = Object.values(dbObjects.TaskTypes)[sourceIndex];
    var newComponent = new dbObjects.SynquestitaskChildComponent(droppedType);
    newComponent.openState = true;

    if(newComponent){
      //Clone the array since we can't mutate the state directly
      var updatedComponents = this.state.taskComponents.slice();
      //Insert the new component at the index stored when add task was called
      updatedComponents.splice(destinationIndex, 0, newComponent);

      let snackbarAction = {
        type: 'TOAST_SNACKBAR_MESSAGE',
        snackbarOpen: true,
        snackbarMessage: "Task component added successfully"
      };
      store.dispatch(snackbarAction);

      this.setState({
        taskComponents: updatedComponents,
        //childOpenStatus: updatedChildStates
      });

      this.synquestitask.childObj = updatedComponents;
    }
  }

  //Remove a task from the list of tasks in the set
  removeComponent(index){
    var newObjectList = [...this.state.taskComponents];
    newObjectList.splice(index, 1);

    var snackbarAction = {
      type: 'TOAST_SNACKBAR_MESSAGE',
      snackbarOpen: true,
      snackbarMessage: "Component removed"
    };
    store.dispatch(snackbarAction);

    this.setState({
      taskComponents: newObjectList,
    });

    this.synquestitask.childObj = newObjectList;
  }

  moveComponent(dragIndex, hoverIndex) {
    var updatedObjectList = this.state.taskComponents.slice();
    db_utils.arrayMove(updatedObjectList, dragIndex, hoverIndex);

    this.setState({
      taskComponents: updatedObjectList,
    });

    this.synquestitask.childObj = updatedObjectList;
  }

  //Removes the selected task from the database
  removeTask() {
    this.shouldCloseAsset = true;

    var snackbarAction = {
      type: 'TOAST_SNACKBAR_MESSAGE',
      snackbarOpen: true,
      snackbarMessage: "Task deleted"
    };
    store.dispatch(snackbarAction);

    db_helper.deleteTaskFromDb(this.synquestitask._id, false, this.handleDBCallback);
  }

  //Calls the provided callback function that handles the closing of this component
  closeSetComponent(componentChanged, overrideShouldClose){
    let shouldClose = overrideShouldClose ? overrideShouldClose : this.shouldCloseAsset;
    this.props.closeTaskCallback(componentChanged, shouldClose);
  }

  onGlobalVariableChanged(e, checked){
    this.synquestitask.globalVariable = checked;
    this.setState({
      globalVariable: checked,
    });
  }

  //On drag end callback from ReactDND
  onDragEnd = result => {
    const { source, destination } = result;

    // dropped outside the list
    if (!destination) {
        return;
    }

    //If the sourc eis the same as the destination we just move the element inside the list
    if (source.droppableId === destination.droppableId) {
        this.moveComponent(source.index,destination.index);
    } else { //Otherwise we add to the list at the desired location
        this.addComponent(source.index, destination.index);
    }
  };
  /*
██████  ███████ ███    ██ ██████  ███████ ██████
██   ██ ██      ████   ██ ██   ██ ██      ██   ██
██████  █████   ██ ██  ██ ██   ██ █████   ██████
██   ██ ██      ██  ██ ██ ██   ██ ██      ██   ██
██   ██ ███████ ██   ████ ██████  ███████ ██   ██
*/

  render() {
    var setContent =
      <div>
        <TextField id="nameText"
          required
          padding="dense"
          defaultValue={this.synquestitask.name}
          placeholder="Demographics task"
          label="Name"
          ref="setTextRef"
          fullWidth
          rows="1"
          onChange={(e)=>{this.synquestitask.name = e.target.value}}
        />
        <TextField id="tags"
          required

          padding="dense"
          defaultValue={this.synquestitask.tags.join(',')}
          placeholder="Demographics, Procedure"
          helperText="Tags seperated by a comma"
          label="Tags"
          fullWidth
          ref="tagsRef"
          onChange={(e)=> this.responseHandler(e, e.target.value, "Tags")}
        />
        <FormControlLabel label="Treat Response as Global Variable"
          value="end"
          padding="dense"
          checked={this.state.globalVariable}
          control={<Checkbox style={{width:"50px"}} color="secondary" />}
          onChange={this.handleGlobalVariableChanged}
          labelPlacement="end"
        />
      </div>;

    var taskTypes = <SynquestitaskTypeList dragEnabled={true} taskList={ Object.values(dbObjects.TaskTypes) }
      itemType="Synquestitask" droppableId="synquestitasks"/>;

    var deleteTaskBtn = null;
    if(this.props.isEditing){
      deleteTaskBtn = <Button onClick={this.removeTask.bind(this)} variant="outlined">
        Delete Set
        </Button>;
    }

    return(
      <DragDropContext onDragEnd={this.onDragEnd}>
        <div className="synquestiComponentContainer">
          <form className="synquestiFormRoot" autoComplete="off" id="formRootId">
              {setContent}
          </form>

          <div className="synquestiTaskOptions">
            {taskTypes}
          </div>

          <div className="synquestitaskListContainer">
            <div className="setTaskListTitle"><div className="setTaskListTitleText"><Typography color="textPrimary">Task components</Typography></div></div>
            <div className="synquestitaskListViewer">
              <Droppable droppableId="synquestitaskListId" >
               {(provided, snapshot) => (
                <div ref={provided.innerRef} style={{width:'100%', height:'100%', minHeight:0}}>
                  < SynquestitaskList removeCallback={this.removeComponentCallback} toggleChildCallback={this.updateChildOpenState.bind(this)}
                  taskComponents={this.state.taskComponents}/ >
                    {provided.placeholder}
                </div>
              )}
              </Droppable>
            </div>
          </div>

          <div className="editSynquestitaskComponentButtons">
            <Button onClick={this.closeSetComponent.bind(this, false, true)} variant="outlined">
              Close
            </Button>
            {deleteTaskBtn}
            <Button onClick={this.onChangeTaskSettings.bind(this)} variant="outlined">
              {this.props.isEditing ? "Save" : "Create"}
            </Button>
          </div>
        </div>
      </DragDropContext>
    );
  }
}

export default EditSynquestitaskComponent;
