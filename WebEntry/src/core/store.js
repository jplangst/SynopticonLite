import { createStore } from 'redux';
import wampStore from './wampStore';

import { createMuiTheme, responsiveFontSizes } from '@material-ui/core/styles';
import lightPrimary from '@material-ui/core/colors/grey';
import lightPrimary2 from '@material-ui/core/colors/blueGrey';
import lightSecondary from '@material-ui/core/colors/orange';
import darkSecondary from '@material-ui/core/colors/amber';

/*
* The store is responsible for storing data that needs to be shared between different parts of the application.
*/

var savedThemeType = JSON.parse(window.localStorage.getItem('theme'));

if(savedThemeType === null || savedThemeType === undefined){
  savedThemeType = "light";
}

function prepareMUITheme(themeType){
  let theme = null;
  if(themeType === "light"){
    theme = createMuiTheme({
      palette:{
        primary:{
          main: "#EEEEEE"
        },
        secondary:{
          main:"#3F51B5"
        },
        // Used by `getContrastText()` to maximize the contrast between the
        // background and the text.
        contrastThreshold: 3,
        // Used to shift a color's luminance by approximately
        // two indexes within its tonal palette.
        // E.g., shift from Red 500 to Red 300 or Red 700.
        tonalOffset: 0.02,
        type: themeType,
      }
    });
  }
  else{
    theme = createMuiTheme({
      palette:{
        primary: {
          //light: '#757ce8',
          main: '#555',
          //dark: '#002884',
          //contrastText: '#fff',
        },
        secondary: darkSecondary,
        // Used by `getContrastText()` to maximize the contrast between the
        // background and the text.
        contrastThreshold: 3,
        // Used to shift a color's luminance by approximately
        // two indexes within its tonal palette.
        // E.g., shift from Red 500 to Red 300 or Red 700.
        tonalOffset: 0.1,
        type: themeType,

      }
    });
  }

  let actionDisabledBG = theme.palette.secondary.light;
  if(theme.palette.secondary.light.includes("#")){
    actionDisabledBG = actionDisabledBG + "66";
  }
  else{
    actionDisabledBG = actionDisabledBG.replace("rgb", "rgba");
    actionDisabledBG = actionDisabledBG.replace(")", ",0.25)");
  }

  theme.palette.action.disabledBackground = actionDisabledBG;

  let selectedItemBGColor = theme.palette.secondary.light;
  if(theme.palette.secondary.light.includes("#")){
    selectedItemBGColor = selectedItemBGColor + "66";
  }
  else{
    selectedItemBGColor = selectedItemBGColor.replace("rgb", "rgba");
    selectedItemBGColor = selectedItemBGColor.replace(")", ",0.25)");
  }

  theme.overrides = {
    MuiSlider:{
      track:{backgroundColor:theme.palette.secondary.dark, height:4},
      thumb:{backgroundColor:theme.palette.secondary.dark}
    },
    MuiInputLabel:{
      root:{"&$focused":{color: theme.palette.secondary.dark, underline:theme.palette.secondary.dark}},
      focused:{borderColor:theme.palette.secondary.dark}
    },
    MuiTouchRipple:{
      ripple: {
        color: theme.palette.secondary.main,
      },
    },
    MuiFormControlLabel:{
      root:{color: theme.palette.text.primary}
    },
    MuiListItem:{
      root:{"&.Mui-selected": {
        backgroundColor: selectedItemBGColor
      }}
    }
  };

  return theme = responsiveFontSizes(theme);
}

let theme = prepareMUITheme(savedThemeType);

const initialState = {
  participants: {},
  remoteEyeTrackers: [],
  gazeCursorRadius: 0,
  gazeData: {},
  aois: [],
  showHeader: true,
  experimentInfo: null,
  windowSize: {
    width: window.innerWidth,
    height: window.innerHeight
  },
  theme: theme,
};

const store = createStore ((state = initialState, action) => {
  switch(action.type) {
    case 'SET_GAZE_DATA': {
      state.gazeData[action.tracker] = action.gazeData;
      if (!state.remoteEyeTrackers.includes(action.tracker)) {
        state.remoteEyeTrackers.push(action.tracker);
        wampStore.setCurrentRemoteTracker(action.tracker);
        wampStore.emitNewRemoteTrackerListener();
      }
      return state;
    }
    case 'SET_PARTICIPANT_ID': {
      return { ... state, experimentInfo: {... state.experimentInfo, participantId: action.participantId}};
    }
    case 'SET_SHOULD_SAVE': {
      return { ... state, experimentInfo: {... state.experimentInfo, shouldSave: action.shouldSave}};
    }
    case 'ADD_PARTICIPANT': {
      state.participants[action.participant] = action.tracker;
      return state;
    }
    case 'REMOVE_PARTICIPANT': {
      if (state.participants[action.participant] != undefined) {
        delete state.participants[action.participant];
      }
      return state;
    }
    case 'SET_GAZE_RADIUS': {
      return { ...state, gazeCursorRadius: action.gazeRadius};
    }
    case 'SET_EXPERIMENT_INFO': {
      return { ...state, experimentInfo: action.experimentInfo}
    }
    case 'SET_SHOW_HEADER': {
      return { ...state, showHeader: action.showHeader}
    }
    case 'WINDOW_RESIZE': {
      return { ...state, windowSize: action.windowSize}
    }
    case 'TOGGLE_THEME_TYPE': {
      let type = state.theme.palette.type === "light" ? "dark" : "light";
      theme = prepareMUITheme(type)
      window.localStorage.setItem('theme', JSON.stringify(type));
      return {...state, theme: theme}
    }
    case 'ADD_AOIS': {
      return {...state, aois: state.aois.concat(action.aois)};
    }
    case 'RESET_AOIS': {
      return {...state, aois: []};
    }
    default:
      return state;
  }
});



export default store;
