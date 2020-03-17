import React, {Component} from 'react';

import Button from '@material-ui/core/Button';
import {FilterList, AddCircleOutline} from '@material-ui/icons';

import SearchBar from '../components/SearchBar';
import CollapsableContainer from '../components/Containers/CollapsableContainer';
import TaskListComponent from '../components/TaskList/TaskListComponent';
import EditSynquestitaskComponent from '../components/AssetEditorComponents/EditSynquestitaskComponent';
import EditTaskComponent from '../components/AssetEditorComponents/EditTaskComponent';
import EditSetComponent from '../components/AssetEditorComponents/EditSetComponent';
import { withTheme } from '@material-ui/styles';

import { DragDropContext } from 'react-beautiful-dnd';

import db_helper from '../core/db_helper.js';
import * as db_objects from '../core/db_objects.js'

import store from '../core/store';

import './EditorMode.css';

class EditorMode extends Component {
  constructor(props) {
    super(props);

    this.state = {
      showMenu: false,
      taskList: [],
      taskSetList: [],
      synquestitaskList: [],
      allowRegex: true,
      assetEditorContext: "empty",
      assetEditorObject: null,

      //Used to determine when it's ok to group tasks into dbTagsCallback
      tagsCollected: false,
      tasksCollected: false,
    };

    //Database callbacks
    this.dbTagsCallback = this.dbTagsCallbackFunction.bind(this);

    this.dbSynquestitaskCallback = this.dbSynquestitaskCallbackFunction.bind(this);
    this.dbTaskCallback = this.dbTaskCallbackFunction.bind(this);
    this.dbTaskSetCallback = this.dbTaskSetCallbackFunction.bind(this);

    //Callback when querying the databaseusing the search fields
    this.dbQueryCallback = this.onDatabaseSearched.bind(this);

    this.gotoPage = this.gotoPageHandler.bind(this);

    //Asset Editor Component Key. Used to force reconstruction...
    this.assetEditorCompKey = 0;

    this.assetViewerQueryDatabase();

    //We might actually not need this functionality since the tag values are contained in the task queries
    //db_helper.queryAllTagValuesFromDB(true,this.dbTagsCallback);
    //db_helper.queryAllTagValuesFromDB(false,this.dbTagsCallback);
  }

  gotoPageHandler(e, route){
    this.props.history.push(route);
  }

  //---------------------------component functions------------------------------
  componentWillMount() {
    let storeState = store.getState();
    if(storeState.shouldEditSet){
      var setEditSetAction = {
        type: 'SET_SHOULD_EDIT',
        shouldEdit: false,
        objectToEdit:null,
        typeToEdit:''
      };
      store.dispatch(setEditSetAction);
      this.selectTaskSet(storeState.setToEdit);
    }
  }

  //Turns out we did not need this functionality after all
  dbTagsCallbackFunction(queryTasks, result){
    console.log(queryTasks);
    console.log(result);
  }

  groupTasksByTags(tasks){
    let tagMap = new Map();
    for(let i = 0; i < tasks.length;i++){
      let task = tasks[i];

      //If the task contains tags we iterate over and add them with value to our map
      if(task.tags.length > 0){
        for(let y = 0; y < task.tags.length;y++){
          let tag = task.tags[y];
          if(tagMap.has(tag)){
            let newValue = tagMap.get(tag);
            newValue.push(task);
            tagMap.set(tag,newValue);
          }
          else{
            let objectList = [];
            objectList.push(task);
            tagMap.set(tag, objectList);
          }
        }
      } //Otherwise we add the task to the No Tag section
      else{
        let key = "No Tag";
        if(tagMap.has(key)){
          let newValue = tagMap.get(key);
          newValue.push(task);
          tagMap.set(key,newValue);
        }
        else{
          let objectList = [];
          objectList.push(task);
          tagMap.set(key, objectList);
        }
      }
    }
    return tagMap;
  }

  dbSynquestitaskCallbackFunction(dbQueryResult) {
    let groupedResult = this.groupTasksByTags(dbQueryResult);
    this.setState({synquestitaskList: groupedResult});
  }

  dbTaskCallbackFunction(dbQueryResult) {
    let groupedResult = this.groupTasksByTags(dbQueryResult);
    this.setState({taskList: groupedResult});
  }

  dbTaskSetCallbackFunction(dbQueryResult) {
    let groupedResult =this.groupTasksByTags(dbQueryResult);
    this.setState({taskSetList: groupedResult});
  }

  //Callback after querying the database using the search fields
  onDatabaseSearched(queryType, result){
    let mapResult = this.groupTasksByTags(result.tasks);
    //mapResult.set(queryType, result.tasks);

    if(queryType === db_objects.ObjectTypes.LEGACY_TASK){
      this.setState({taskList: mapResult});
    }
    else if(queryType === db_objects.ObjectTypes.SET){
      this.setState({taskSetList: mapResult});
    }
    else if(queryType === db_objects.ObjectTypes.TASK){
      this.setState({synquestitaskList: mapResult});
    }
  }

  assetViewerQueryDatabase() {
    db_helper.getAllTasksFromDb(false,this.dbSynquestitaskCallback);
    db_helper.getAllTasksFromDb(true,this.dbTaskCallback);
    db_helper.getAllTaskSetsFromDb(this.dbTaskSetCallback);
  }

  //actions callbacks
  selectTask(task) {
    this.assetEditorCompKey += 1;

    var assetObject = <EditTaskComponent isEditing={true} taskObject={task}
      closeTaskCallback={this.assetEditorObjectClosed.bind(this)}
      key={this.assetEditorCompKey}
    />;

    this.setState(state => ({selectedTaskSet:null, selectedSynquestitask:null, selectedTask: task, assetEditorObject: assetObject}));
  }

  selectSynquestitask(task) {
    this.assetEditorCompKey += 1;

    var assetObject = <EditSynquestitaskComponent isEditing={true} synquestitask={task}
      closeTaskCallback={this.assetEditorObjectClosed.bind(this)}
      key={this.assetEditorCompKey}
    />;

    this.setState(state => ({selectedTaskSet:null, selectedTask: null, selectedSynquestitask: task, assetEditorObject: assetObject}));
  }

  selectTaskSet(taskSet) {
    this.assetEditorCompKey += 1;
    this.editSetComponentRef = React.createRef();

    var assetObject = <EditSetComponent isEditing={true}
      setObject={taskSet} closeSetCallback={this.assetEditorObjectClosed.bind(this)}
      key={this.assetEditorCompKey} ref={this.editSetComponentRef}
      runTestSet={()=>{this.props.history.push('/DisplayTaskComponent')}}/>;

    this.setState({selectedTask: null, selectedSynquestitask:null, selectedTaskSet:taskSet, assetEditorObject: assetObject});
  }

  //Callback from the asset editor object if an object has been changed that requires a refresh of the page
  assetEditorObjectClosed(dbChanged, shouldCloseAsset){
    if(shouldCloseAsset){
      this.clearAssetEditorObject();
    }

    if(dbChanged){
      db_helper.getAllTasksFromDb(true,this.dbTaskCallback);
      db_helper.getAllTasksFromDb(false,this.dbSynquestitaskCallback);
      db_helper.getAllTaskSetsFromDb(this.dbTaskSetCallback);
    }

    let storeState = store.getState();
    if(storeState.shouldEdit){
      if(storeState.typeToEdit === 'set'){
        this.selectTaskSet(storeState.objectToEdit);
      }
      else if(storeState.typeToEdit === 'task'){
        this.selectTask(storeState.objectToEdit);
      }
      else if(storeState.typeToEdit === 'synquestitask'){
        //this.selectSynquestitask(storeState.objectToEdit);
      }
      var setEditAction = {
        type: 'SET_SHOULD_EDIT',
        shouldEdit: false,
        typeToEdit: ''
      }
      store.dispatch(setEditAction);
    }
  }

  //Closes the current objecy being viewed in the asset editor view
  clearAssetEditorObject(){
    this.setState({selectedTask: null, assetEditorContext: "empty", assetEditorObject: null, selectedTaskSet: null, selectedSynquestitask:null});
  }

  removeTaskSet(taskSet) {
    db_helper.deleteTaskSetFromDb(taskSet._id);
  }

  //Adds escape characters in fornt of all common regex symbols
  escapeRegExp(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
  }

  onSearchInputChanged(type, e){
    console.log(type);

    var searchString = "";
    if(typeof(e)==='object'){
      searchString = e.target.value;

      if(!this.state.allowRegex){
        searchString = this.escapeRegExp(searchString);
      }

      if(searchString.includes(",")){
        searchString = searchString.split(",");
        searchString = searchString.map((value)=>{
          return value.trim();
        });
        searchString = searchString.filter(Boolean); //Remove empty values

        if(searchString.length === 1){
          searchString = searchString[0];
        }
      }
    }

    db_helper.queryTasksFromDb(type, searchString, this.dbQueryCallback);
  }

  addSynquestitaskCallback(){
    this.assetEditorCompKey += 1;
    this.clearAssetEditorObject();
    this.setState({assetEditorObject: <EditSynquestitaskComponent isEditing={false}
      closeTaskCallback={this.assetEditorObjectClosed.bind(this)}
      key={this.assetEditorCompKey} />});
  }

  addTaskCallback(){
    this.assetEditorCompKey += 1;
    this.clearAssetEditorObject();
    this.setState({assetEditorObject: <EditTaskComponent isEditing={false}
      closeTaskCallback={this.assetEditorObjectClosed.bind(this)}
      key={this.assetEditorCompKey} />});
  }

  addSetCallback(){
    this.assetEditorCompKey += 1;
    this.clearAssetEditorObject();
    this.editSetComponentRef = React.createRef();
    this.setState({assetEditorObject: <EditSetComponent isEditing={false}
      closeSetCallback={this.assetEditorObjectClosed.bind(this)}
      key={this.assetEditorCompKey} ref={this.editSetComponentRef}/>});
  }

  //On drag end callback
  onDragEnd = result => {
      const { source, destination } = result;

      // dropped outside the list
      if (!destination) {
          return;
      }

      console.log(source.droppableId);

      //If the source is the same as the destination we just move the element inside the list
      if (source.droppableId === destination.droppableId) {
          this.editSetComponentRef.current.moveTask(source.index,destination.index);
      } else { //Otherwise we add to the list at the desired location
          var itemType;
          if(source.droppableId === "Sets"){
            itemType = "TaskSet";
          }
          else if(source.droppableId === "Tasks"){
            itemType = "Synquestitask";
          }
          else{
            itemType = "Task";
          }

          let id = result.draggableId;
          if(id.includes('_')){
            id = result.draggableId.split('_')[0];
          }

          console.log(itemType,id);

          var dragableItem = {objType:itemType,_id:id};
          this.editSetComponentRef.current.addTask(dragableItem, destination.index);
      }
  };

  //Get the current asset editorObject
  getAssetEditorObject(){
    let theme = this.props.theme;
    let rightBG = theme.palette.type === "light" ? theme.palette.primary.main : theme.palette.primary.dark;

    var assetEditorObject =
    <div className="AssetEditor" style={{paddingLeft:5, backgroundColor:rightBG}}>
      <div className="AssetEditorContent">
        {this.state.assetEditorObject}
      </div>
    </div>;

    return assetEditorObject;
  }

  //
  getCollapsableHeaderButtons(searchCallback, addCallback, filterCallback, searchBarID){

    var filterButton = null;
    if(filterCallback !== null){
      filterButton = <Button style={{width: '100%', height: '100%'}}
      className="collapsableHeaderBtns" size="small" onClick={filterCallback} >
        <FilterList fontSize="large"/>
      </Button>;
    }

    var collapsableTaskHeaderButtons =
    <div className="collapsableHeaderBtnsContainer">
      <div className="searchWrapperDiv"><SearchBar onChange={searchCallback} searchID={searchBarID}/></div>
      <div className="collapsableBtns">
        <Button style={{position:"relative", width: '100%', height: '100%', minWidth:0, minHeight:0}} size="small" onClick={addCallback} >
          <AddCircleOutline fontSize="large"/>
        </Button>
        {filterButton}
      </div>
    </div>;

    //Currently filter is not implemented so we don't render it

    return collapsableTaskHeaderButtons;
  }

  getTaskTypeContainer(taskType, taskMap){
    var dragEnabled = false;
    if(this.state.assetEditorObject && this.state.assetEditorObject.type === EditSetComponent){
      dragEnabled = true;
    }

    let containerContent = [];

    let selectedTask = null;
    let selectCallback = null;
    let searchType = "";
    if(taskType === db_objects.ObjectTypes.TASK){
      selectedTask = this.state.selectedSynquestitask;
      selectCallback = this.selectSynquestitask.bind(this);
    }
    else if(taskType === db_objects.ObjectTypes.LEGACY_TASK){
      selectedTask = this.state.selectedTask;
      selectCallback = this.selectTask.bind(this);
    }
    else if(taskType === db_objects.ObjectTypes.SET){
      selectedTask = this.state.selectedTaskSet;
      selectCallback = this.selectTaskSet.bind(this);
    }
    else{
      console.log("unknown task type: ", taskType);
      return null;
    }

    let collapsableHeaderButtons = this.getCollapsableHeaderButtons(this.onSearchInputChanged.bind(this, taskType),
      this.addTaskCallback.bind(this), null, taskType+"SearchBar");

    let index = 0;

    for (const [key, value] of taskMap.entries()) {
      containerContent.push(<CollapsableContainer headerTitle={key} useMediaQuery={false}
      hideHeaderComponents={true} open={true} key={key+index}>
          < TaskListComponent dragEnabled={dragEnabled} taskList={ value }
            selectTask={ selectCallback } selectedTask={selectedTask}
            itemType={taskType} droppableId={taskType} idSuffix={key}/ >
      </CollapsableContainer>);
      index++;
    }

    /*< TaskListComponent dragEnabled={dragEnabled} taskList={ this.state.synquestitaskList }
      selectTask={ this.selectSynquestitask.bind(this) } selectedTask={this.state.selectedSynquestitask}
      itemType="Synquestitask" droppableId="synquestitasks"/ >*/

    let container =
    <CollapsableContainer headerTitle={taskType} useMediaQuery={true}
    headerComponents={collapsableHeaderButtons} hideHeaderComponents={true} open={true}>
      {containerContent}
    </CollapsableContainer>;

    return container;
  }

  /*
██████  ███████ ███    ██ ██████  ███████ ██████
██   ██ ██      ████   ██ ██   ██ ██      ██   ██
██████  █████   ██ ██  ██ ██   ██ █████   ██████
██   ██ ██      ██  ██ ██ ██   ██ ██      ██   ██
██   ██ ███████ ██   ████ ██████  ███████ ██   ██
*/

  render() {
    let theme = this.props.theme;
    let leftBG = theme.palette.type === "light" ? theme.palette.primary.dark : theme.palette.primary.main;

    /*var collapsableTaskHeaderButtons = this.getCollapsableHeaderButtons(this.onSearchInputChanged.bind(this, "task"),
      this.addTaskCallback.bind(this), null, "taskSearchBar");
    var collapsableSetHeaderButtons = this.getCollapsableHeaderButtons(this.onSearchInputChanged.bind(this, "set"),
      this.addSetCallback.bind(this), null, "setSearchBar");
    var collapsableSynquestitaskHeaderButtons = this.getCollapsableHeaderButtons(this.onSearchInputChanged.bind(this, "synquestitask"),
      this.addSynquestitaskCallback.bind(this), null, "synquestitaskSearchBar");

    var dragEnabled = false;
    if(this.state.assetEditorObject && this.state.assetEditorObject.type === EditSetComponent){
      dragEnabled = true;
    }*/

    return (
    <DragDropContext onDragEnd={this.onDragEnd}>
      <div className = "editorScreenContainer">

        <div style={{backgroundColor:leftBG}} className = "AssetViewer">
          <div className="AssetViewerContent">
            {this.getTaskTypeContainer("Tasks", this.state.synquestitaskList)}
            {this.getTaskTypeContainer("Legacy Tasks", this.state.taskList)}
            {this.getTaskTypeContainer("Sets", this.state.taskSetList)}
          </div>
        </div>

        {this.getAssetEditorObject()}

      < /div>
    </DragDropContext>
    );
  }
}

/*
{this.getTaskTypeContainer("Tasks", this.state.synquestitaskList)}
{this.getTaskTypeContainer("Legacy Tasks", this.state.taskList)}
*/
/*
<CollapsableContainer headerTitle="Tasks" useMediaQuery={true}
headerComponents={collapsableSynquestitaskHeaderButtons} hideHeaderComponents={true} open={true}>
    < TaskListComponent dragEnabled={dragEnabled} taskList={ this.state.synquestitaskList }
      selectTask={ this.selectSynquestitask.bind(this) } selectedTask={this.state.selectedSynquestitask}
      itemType="Synquestitask" droppableId="synquestitasks"/ >
</CollapsableContainer>

<CollapsableContainer headerTitle="Legacy Tasks" useMediaQuery={true}
headerComponents={collapsableTaskHeaderButtons} hideHeaderComponents={true} open={true}>
    < TaskListComponent dragEnabled={dragEnabled} taskList={ this.state.taskList }
      selectTask={ this.selectTask.bind(this) } selectedTask={this.state.selectedTask}
      itemType="Task" droppableId="tasks"/ >
</CollapsableContainer>

<CollapsableContainer headerTitle="Sets" useMediaQuery={true}
headerComponents={collapsableSetHeaderButtons} hideHeaderComponents={true}
open={true}>
    < TaskListComponent dragEnabled={dragEnabled} selectedTask={this.state.selectedTaskSet}
      taskList={ this.state.taskSetList } selectTask={ this.selectTaskSet.bind(this) }
      itemType="TaskSet" droppableId="sets"/ >
</CollapsableContainer>
*/

export default withTheme(EditorMode);
