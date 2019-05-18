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
    const graphqlQuery = {
      query: `query FetchPost($postId: String!) {
        post(id: $postId) {
          title
          content
          imageUrl
          creator {
            name
          }
          createdAt
        }
      }`,
      variables: {
        postId
      }
    }
    try {
      let response = await fetch(`http://localhost:8080/graphql`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${this.props.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(graphqlQuery)
      })
      if (response.errors) throw new Error('Unable to fetch the post');
      response = await response.json();
      this.setState({
        title: response.data.post.title,
        author: response.data.post.creator.name,
        image: `http://localhost:8080/${response.data.post.imageUrl}`,
        date: new Date(response.data.post.createdAt).toLocaleDateString('en-US'),
        content: response.data.post.content
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
