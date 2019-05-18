import React, { Component, Fragment } from 'react';

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
    const graphqlQuery = {
      query: `
        {
          user {
            status
          }
        }
      `
    }
    try {
      let response = await fetch('http://localhost:8080/graphql', {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${this.props.token}`,
          'Content-Type': 'application-json'
        },
        body: JSON.stringify(graphqlQuery)
      })
      response = await response.json();
      if (response.errors) throw new Error('Failed to fetch user status.');

      this.setState({ status: response.data.user.status });
      this.loadPosts();
    } catch (e) {
      this.catchError(e);
    }
  }

  loadPosts = async direction => {
    if (direction) {
      this.setState({ postsLoading: true, posts: [] });
    }
    //pagination
    let page = this.state.postPage;
    if (direction === 'next') {
      page++;
      this.setState({ postPage: page });
    }
    if (direction === 'previous') {
      page--;
      this.setState({ postPage: page });
    }

    const graphqlQuery = {
      query: `
        query GetPosts($page: Int) {
          getPosts(page: $page) {
            posts {
              _id
              title
              content
              imageUrl
              creator {
                name
              }
              createdAt
            }
            totalPosts
          }
        }
      `,
      variables: {
        page
      }
    }
    
    try {
      let response = await fetch('http://localhost:8080/graphql', {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${this.props.token}`,
          'Content-Type': 'application-json'
        },
        body: JSON.stringify(graphqlQuery)
      })
  
      response = await response.json();

      if (response.errors) throw new Error('Unable to fetch posts');

      this.setState({
        posts: response.data.getPosts.posts.map(post => {
          return {
            ...post,
            imagePath: post.imageUrl
          }
        }),
        totalPosts: response.data.getPosts.totalPosts,
        postsLoading: false
      });
    } catch (e) {
      this.catchError(e);
    } 
  };

  statusUpdateHandler = async event => {
    event.preventDefault();
    const graphqlQuery = {
      query: `
        mutation UpdateStatus($status: String!) {
          updateStatus(status: $status) {
            status
          }
        }
      `,
      variables: {
        status: this.state.status
      }
    }
    try {
      let response = await fetch('http://localhost:8080/graphql', {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${this.props.token}`,
          'Content-Type': 'application-json'
        },
        body: JSON.stringify(graphqlQuery)
      })
      response = await response.json();
      if (response.errors) throw new Error("Can't update status!");
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
    formData.append('image', postData.image);
    if (this.state.editPost) formData.append('oldPath', this.state.editPost.imageUrl);

    try {
      let res = await fetch('http://localhost:8080/upload-image', {
        method: 'PUT',
        headers: { 
          Authorization: `Bearer ${this.props.token}`
        },
        body: formData 
      });
      res = await res.json(res);

      const imageUrl = res.filePath || 'undefined';

      let graphqlQuery = {
        query: `
          mutation CreatePost($title: String!, $content: String!, $imageUrl: String!) {
            createPost(postInput: {title: $title, content: $content, imageUrl: $imageUrl}) {
              _id
              title
              content
              imageUrl
              creator {
                name
              }
              createdAt
            }
          }
        `,
        variables: {
          title: postData.title,
          content: postData.content,
          imageUrl
        }
      }

      if (this.state.editPost) {
        graphqlQuery = {
          query: `
            mutation: UpdatePost($postId: String!, $title: String!, $content: String!, $imageUrl: String!) {
              updatePost(postInput: {id: $postId, title: $title, content: $content, imageUrl: $imageUrl}) {
                _id
                title
                content
                imageUrl
                creator {
                  name
                }
                createdAt
              }
            }
          `,
          variables: {
            id: this.state.editPost._id,
            title: this.state.editPost._title,
            content: this.state.editPost._content,
            imageUrl
          }
        }
      }

      let response = await fetch('http://localhost:8080/graphql', { 
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${this.props.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(graphqlQuery),
      })
      response = await response.json();

      if (response.errors && response.errors[0].status === 422) 
        throw new Error('Unable to create a new post. Validation failed');
      let responseDataField = 'createPost';
      if (this.state.editPost) responseDataField = 'updatePost';
      const post = {
        _id: response.data[responseDataField]._id,
        title: response.data[responseDataField].title,
        content: response.data[responseDataField].content,
        creator: response.data[responseDataField].creator,
        createdAt: response.data[responseDataField].createdAt,
        imagePath: response.data[responseDataField].imageUrl
      };
      this.setState(prevState => {
        let updatedPosts = [...prevState.posts];
        let updatedTotalPosts = prevState.posts;
        if (prevState.editPost) {
          const postIndex = prevState.posts.findIndex(
            p => p._id === prevState.editPost._id
          );
          updatedPosts[postIndex] = post;
        } else {
          updatedTotalPosts++;
          if (prevState.posts.length >= 2) updatedPosts.pop();
          updatedPosts.unshift(post);
        }
        return {
          posts: updatedPosts,
          isEditing: false,
          editPost: null,
          editLoading: false,
          totalPosts: updatedTotalPosts
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
    const graphqlQuery = {
      query: `
        mutation {
          deletePost(id, "${postId}")
        }
      `
    }
    try {
      let response = await fetch('http://localhost:8080/graphql', { 
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${this.props.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(graphqlQuery)
      })
      response = await response.json();
      if (response.errors) throw new Error('Deleting a post failed!');
  
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
