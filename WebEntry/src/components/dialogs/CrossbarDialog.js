import React, { Component } from 'react';

import DialogTitle from '@material-ui/core/DialogTitle';
import DialogContent from '@material-ui/core/DialogContent';
import DialogActions from '@material-ui/core/DialogActions';
import Dialog from '@material-ui/core/Dialog';
import DialogContentText from '@material-ui/core/DialogContentText';

import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';

import {restartWAMP} from '../../core/wamp';

var myStorage = window.localStorage;

class CrossbarDialog extends Component {
  componentWillMount() {
    this.crossbarConfigurations();
    restartWAMP(this.crossbar);
  }

  componentWillUnmount() {
  }

  //-----------Crossbar Settings------------
  crossbarConfigurations() {
    var crossbarConfig = JSON.parse(myStorage.getItem('crossbar'));
    this.crossbar = (crossbarConfig && crossbarConfig !== undefined && crossbarConfig.ip !== undefined) ? crossbarConfig : {
      ip: "127.0.0.1",
      port: 8080,
      realm: "realm1"
    }
  }

  onChangeCrossbarSettings(e) {
    myStorage.setItem('crossbar', JSON.stringify(this.crossbar));
    restartWAMP(this.crossbar);

    //Callback to close the dialog from the header
    this.props.closeCrossbarSettings();
  }

  render() {
    return(
      <Dialog //------------------------crossbar settings------------------------
          open={this.props.openCrossbarSettings}
          onClose={this.props.closeCrossbarSettings}
          aria-labelledby="form-dialog-title"
        >
          <DialogTitle id="form-dialog-title">Crossbar Settings</DialogTitle>
          <DialogContent>
            <DialogContentText>Change crossbar Router information</DialogContentText>
            <TextField
              required
              autoFocus
              margin="normal"
              id="crossbarIP"
              defaultValue={this.crossbar.ip}
              label="Crossbar IP Address"
              ref="CrossbarIPRef"
              onChange={(e)=>{this.crossbar.ip = e.target.value}}
            />
            <TextField
              required
              autoFocus
              margin="normal"
              id="crossbarPort"
              defaultValue={this.crossbar.port}
              label="Crossbar port"
              type="number"
              ref="CrossbarPortRef"
              onChange={(e)=>{this.crossbar.port = e.target.value}}
            />
            <TextField
              required
              autoFocus
              margin="dense"
              id="crossbarRealm"
              defaultValue={this.crossbar.realm}
              label="Crossbar Realm"
              ref="CrossbarRealmRef"
              fullWidth
              onChange={(e)=>{this.crossbar.realm = e.target.value}}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={this.props.closeCrossbarSettings} color="primary">
              Cancel
            </Button>
            <Button onClick={this.onChangeCrossbarSettings.bind(this)} color="primary">
              OK
            </Button>
          </DialogActions>
      </Dialog>
    );
  }
}

export default CrossbarDialog;
