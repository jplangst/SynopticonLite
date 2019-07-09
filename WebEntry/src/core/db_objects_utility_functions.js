export function getTaskContent(task){
  var content = null;

  if(task.objType === "Task"){
    //The set list has a different data structure
    if(task.data){
      task = task.data;
    }

    if(task.taskType === "Multiple Choice" || task.taskType === "Text Entry"
      || task.taskType === "Single Choice"){
        content = task.question;
    }
    else if(task.taskType === "Instruction"){
      content = task.instruction;
    }
    else if(task.taskType === "Image"){
      content = task.question;
    }
  }
  else if(task.objType === "TaskSet"){
    content = task.name;
  }

  return content;
}