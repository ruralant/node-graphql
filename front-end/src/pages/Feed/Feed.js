import React, { Component, Fragment } from 'react';
import openSocket from 'socket.io-client';

import Post from '../../components/Feed/Post/Post';
import Button from '../../components/Button/Button';
import FeedEdit from '../../components/Feed/FeedEdit/FeedEdit';
import Input from '../../components/Form/Input/Input';
import Paginator from '../../components/Paginator/Paginator';
import Loader from '../../components/Loader/Loader';
import ErrorHandler from '../../components/ErrorHandler/ErrorHandler';
import './Feed.css';

class Feed extends Component {
  state = {
    isEditing: false,
    posts: [],
    totalPosts: 0,
    editPost: null,
    status: '',
    postPage: 1,
    postsLoading: true,
    editLoading: false
  };

  async componentDidMount() {
    try {
      const response = await fetch('http://localhost:8080/auth/status', {
        headers: { Authorization: `Bearer ${this.props.token}` }
      });
      if (response.status !== 200) {
        throw new Error('Failed to fetch user status.');
      }

      const data = await response.json();
      this.setState({ status: data.status });
      this.loadPosts();
      const socket = openSocket('http://localhost:8080');
      socket.on('posts', data => {
        if (data.action === 'created') {
          this.addPost(data.post);
        } else if (data.action === 'update') {
          this.updatePost(data.post);
        } else if (data.action === 'delete') {
          this.loadPosts();
        }
      })
    } catch (e) {
      this.catchError(e);
    }
  }

  addPost = post => {
    this.setState(prevState => {
      const updatedPosts = [...prevState.posts];
      if (prevState.postPage === 1) {
        if (prevState.posts.length >= 2) {
          updatedPosts.pop();
        }
        updatedPosts.unshift(post);
      }
      return {
        posts: updatedPosts,
        totalPosts: prevState.totalPosts + 1
      };
    });
  }

  updatePost = post => {
    this.setState(prevState => {
      const updatedPosts = [...prevState.posts];
      const updatedPostIndex = updatedPosts.findIndex(p => p._id === post._id);
      if (updatedPostIndex > -1) {
        updatedPosts[updatedPostIndex] = post;
      }
      return {
        posts: updatedPosts
      };
    });
  };

  loadPosts = async direction => {
    if (direction) {
      this.setState({ postsLoading: true, posts: [] });
    }
    let page = this.state.postPage;
    if (direction === 'next') {
      page++;
      this.setState({ postPage: page });
    }
    if (direction === 'previous') {
      page--;
      this.setState({ postPage: page });
    }
    
    try {
      const response = await fetch(`http://localhost:8080/feed/posts?page=${page}`, {
        headers: { Authorization: `Bearer ${this.props.token}` }
      })
      if (response.status !== 200) {
        throw new Error('Failed to fetch posts.');
      }
  
      const data = await response.json();
      this.setState({
        posts: data.posts.map(post => {
          return {
            ...post,
            imagePath: post.imageUrl
          }
        }),
        totalPosts: data.totalItems,
        postsLoading: false
      });
    } catch (e) {
      this.catchError(e);
    } 
  };

  statusUpdateHandler = async event => {
    event.preventDefault();

    try {
      const response = await fetch('URL');
      if (response.status !== 200 && response.status !== 201) {
        throw new Error("Can't update status!");
      }
      const data = await response.json();
    } catch (e) {
      this.catchError(e);
    }
  };

  newPostHandler = () => {
    this.setState({ isEditing: true });
  };

  startEditPostHandler = postId => {
    this.setState(prevState => {
      const loadedPost = { ...prevState.posts.find(p => p._id === postId) };

      return { isEditing: true, editPost: loadedPost };
    });
  };

  cancelEditHandler = () => {
    this.setState({ isEditing: false, editPost: null });
  };

  finishEditHandler = async postData => {
    this.setState({ editLoading: true });
    const formData = new FormData();
    formData.append('title', postData.title);
    formData.append('content', postData.content);
    formData.append('image', postData.image);
    let url = 'http://localhost:8080/feed/post';
    let method = 'POST';
    if (this.state.editPost) {
      url = `http://localhost:8080/feed/post/${this.state.editPost._id}`;
      method = 'PUT';
    }

    try {
      const response = await fetch(url, { 
        method,
        body: formData,
        headers: { Authorization: `Bearer ${this.props.token}` }
      })
      if (response.status !== 200 && response.status !== 201) {
        throw new Error('Creating or editing a post failed!');
      }
      
      const data = await response.json();
      const post = {
        _id: data.post._id,
        title: data.post.title,
        content: data.post.content,
        creator: data.post.creator,
        createdAt: data.post.createdAt
      };
      this.setState(prevState => {
        return {
          isEditing: false,
          editPost: null,
          editLoading: false
        };
      });
    } catch (e) {
      this.setState({
        isEditing: false,
        editPost: null,
        editLoading: false,
        error: e
      });
    }
  };

  statusInputChangeHandler = (input, value) => {
    this.setState({ status: value });
  };

  deletePostHandler = async postId => {
    this.setState({ postsLoading: true });

    try {
      const response = await fetch(`http://localhost:8080/feed/post/${postId}`, { 
        method: 'DELETE',
        headers: { Authorization: `Bearer ${this.props.token}` }
      })
      if (response.status !== 200 && response.status !== 201) {
        throw new Error('Deleting a post failed!');
      }
  
      const data = await response.json();
      this.loadPosts();

    } catch (e) {
      this.setState({ postsLoading: false });
    }
  };

  errorHandler = () => {
    this.setState({ error: null });
  };

  catchError = error => {
    this.setState({ error });
  };

  render() {
    return (
      <Fragment>
        <ErrorHandler error={this.state.error} onHandle={this.errorHandler} />
        <FeedEdit
          editing={this.state.isEditing}
          selectedPost={this.state.editPost}
          loading={this.state.editLoading}
          onCancelEdit={this.cancelEditHandler}
          onFinishEdit={this.finishEditHandler}
        />
        <section className="feed__status">
          <form onSubmit={this.statusUpdateHandler}>
            <Input
              type="text"
              placeholder="Your status"
              control="input"
              onChange={this.statusInputChangeHandler}
              value={this.state.status}
            />
            <Button mode="flat" type="submit">
              Update
            </Button>
          </form>
        </section>
        <section className="feed__control">
          <Button mode="raised" design="accent" onClick={this.newPostHandler}>
            New Post
          </Button>
        </section>
        <section className="feed">
          {this.state.postsLoading && (
            <div style={{ textAlign: 'center', marginTop: '2rem' }}>
              <Loader />
            </div>
          )}
          {this.state.posts.length <= 0 && !this.state.postsLoading ? (
            <p style={{ textAlign: 'center' }}>No posts found.</p>
          ) : null}
          {!this.state.postsLoading && (
            <Paginator
              onPrevious={this.loadPosts.bind(this, 'previous')}
              onNext={this.loadPosts.bind(this, 'next')}
              lastPage={Math.ceil(this.state.totalPosts / 2)}
              currentPage={this.state.postPage}
            >
              {this.state.posts.map(post => (
                <Post
                  key={post._id}
                  id={post._id}
                  author={post.creator.name}
                  date={new Date(post.createdAt).toLocaleDateString('en-US')}
                  title={post.title}
                  image={post.imageUrl}
                  content={post.content}
                  onStartEdit={this.startEditPostHandler.bind(this, post._id)}
                  onDelete={this.deletePostHandler.bind(this, post._id)}
                />
              ))}
            </Paginator>
          )}
        </section>
      </Fragment>
    );
  }
}

export default Feed;
