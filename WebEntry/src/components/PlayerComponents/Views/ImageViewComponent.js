import React, { Component } from 'react';

import store from '../../../core/store';

import './ImageViewComponent.css';

class ImageViewComponent extends Component {
  constructor(props) {
    super(props);
    this.state = {
      imageSrc: null
    }
    this.image = null;
    this.imageRef = React.createRef();
  }
  componentWillMount() {
    //db_helper.getImage(this.props.task.image, this.onReceivedImage.bind(this));
    //
    this.image = new Image();
    this.image.src = "/Images/" + this.props.task.image;
    this.image.ref = this.imageRef;
  }

  componentDidMount() {


    /*this.image = new Image();
    this.image.src = "/Images/" + this.props.task.image;
    this.image.ref = this.imageRef;*/

    if (this.props.task.aois.length > 0) {
      var aois = this.props.task.aois.slice();
      for (var i = 0; i < aois.length; i++) {
        aois[i].imageRef = this.imageRef;
      }
      console.log("add aois", aois);

      var action = {
        type: 'ADD_AOIS',
        aois: aois
      }

      store.dispatch(action);
    }
    var imageAOIAction = {
      type: 'ADD_AOIS',
      aois: {
        name: this.props.parentSet + '_' + this.props.task.question,
        boundingbox: [],
        imageRef: this.imageRef
      }
    }
    store.dispatch(imageAOIAction);
  }

  onReceivedImage(img) {
    this.image = this.props.task.image;
    this.setState({
      imageSrc: img
    });
  }

  render() {
    // <svg id="AOICanvas" className="imageViewWithAOIs" width='100%' height='100%' viewBox="0 0 100 100" preserveAspectRatio="none">
    //   {this.props.task.aois.map((aoi, index) => {
    //     return <AOIComponent aoi={aoi} key={index}/>
    //   })}
    // </svg>
    //if (this.state.imageSrc) {
    var url = "/Images/" + this.props.task.image;
    console.log(url);
      return (
        <div className="imageViewWrapper">
          <img className="imageView" src={url} alt="" ref={this.imageRef}/>
        </div>
      );
    // }
    // else {
    //   return (<div/>);
    // }
  }
}

export default ImageViewComponent;