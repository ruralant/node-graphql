import React, { Component } from 'react';

import Image from '../../../components/Image/Image';
import './SinglePost.css';

class SinglePost extends Component {
  state = {
    title: '',
    author: '',
    date: '',
    image: '',
    content: ''
  };

  async componentDidMount() {
    const postId = this.props.match.params.postId;
    try {
      const response = await fetch(`http://localhost:8080/feed/post/${postId}`, {
        headers: { Authorization: `Bearer ${this.props.token}` }
      })
      if (response.status !== 200) {
        throw new Error('Failed to fetch status');
      }
      const data = await response.json();
      this.setState({
        title: data.post.title,
        author: data.post.creator.name,
        image: `http://localhost:8080/${data.post.imageUrl}`,
        date: new Date(data.post.createdAt).toLocaleDateString('en-US'),
        content: data.post.content
      });
    } catch (e) {
      console.log(e);
    }
  }

  render() {
    return (
      <section className="single-post">
        <h1>{this.state.title}</h1>
        <h2>
          Created by {this.state.author} on {this.state.date}
        </h2>
        <div className="single-post__image">
          <Image contain imageUrl={this.state.image} />
        </div>
        <p>{this.state.content}</p>
      </section>
    );
  }
}

export default SinglePost;
