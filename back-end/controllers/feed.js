const fs = require('fs');
const path = require('path');
const { validationResult } = require('express-validator/check');

const io = require('../socket');
const Post = require('../models/post');
const User = require('../models/user');

exports.getPosts = async (req, res, next) => {
  try {
    const { page } = req.query || 1;
    const perPage = 2;
    const totalItems = await Post.find().countDocuments();
    const posts = await Post.find()
      .populate('creator')
      .sort({createdAt: -1})
      .skip((page - 1) * perPage)
      .limit(perPage);
    res.status(200).json({ message: 'Posts fetched successfully', posts, totalItems });
  } catch (e) {
    if (!e.statusCode) {
      e.statusCode = 500;
    }
    next(e);
  }
};

exports.createPost = async (req, res, next) => {
  try {
    const errors = validationResult(req);
  
    if (!errors.isEmpty()) {
      const error = new Error('Validation failed ');
      error.statusCode = 422;
      throw error;
    }
    if (!req.file) {
      const error = new Error('No image provided.');
      error.statusCode = 422;
      throw error;
    }

    const { title, content } = req.body;
    const imageUrl = req.file.path;
    let post = new Post({
      title,
      content,
      imageUrl,
      creator: req.userId,
    });
    post = await post.save();
    let user = await User.findById(req.userId);
    user.posts.push(post);
    user = await user.save()
    io.getIo().emit('posts', { 
      action: 'create', 
      post: { ...post._doc, creator: { 
        _id: req.userId, 
        name: user.name
      }}
    });
    res.status(201).json({ message: 'Post created successfully!', post, creator: { id: user._id, name: user.name } });
  } catch (e) {
    if (!e.statusCode) {
      e.statusCode = 500;
    }
    next(e);
  }
};

exports.getPost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const post = await Post.findById(id);

    if (!post) {
      const error = new Error('No post found');
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json({ message: 'Post fetched', post });
  } catch (e) {
    if (!e.statusCode) {
      e.statusCode = 500;
    }
    next(e);
  }
}

exports.updatePost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      const error = new Error('Validation failed ');
      error.statusCode = 422;
      throw error;
    }
  
    const { title, content } = req.body;
    let imageUrl = req.body.image;
    if (req.file) {
      imageUrl = req.file.path;
    }
    if (!imageUrl) {
      const error = new Error('No file picked');
      error.statusCode = 422;
      throw error;
    }
  
    let post = await Post.findById(id).populate('creator');

    if (!post) {
      const error = new Error('No post found');
      error.statusCode = 404;
      throw error;
    }

    if (post.creator._id.toString() !== req.userId) {
      const error = new Error('Not authorized');
      error.statusCode = 403;
      throw error;
    }

    if (imageUrl !== post.imageUrl) {
      clearImage(post.imageUrl);
    }

    post.title = title;
    post.imageUrl = imageUrl;
    post.content = content;
    post = await post.save();
    io.getIo().emit('posts', { action: 'update', post });
    res.status(201).json({ message: 'Post updated!', post });
  } catch (e) {
    if (!e.statusCode) {
      e.statusCode = 500;
    }
    next(e);
  }
}

exports.deletePost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const post = await Post.findById(id);

    if (!post) {
      const error = new Error('No post found');
      error.statusCode = 404;
      throw error;
    }

    if (post.creator.toString() !== req.userId) {
      const error = new Error('Not authorized');
      error.statusCode = 403;
      throw error;
    }

    // check how created the post
    clearImage(post.imageUrl);
    await Post.findByIdAndRemove(id);
    let user = await User.findById(req.userId);
    user.posts.pull(id);
    user = user.save();
    io.getIo().emit('posts', { action: 'delete', post: id });
    res.status(200).json({ message: 'Post deleted successfully' });
  } catch (e) {
    if (!e.statusCode) {
      e.statusCode = 500;
    }
    next(e);
  }
}

 const clearImage = filePath => {
   filePath = path.join(__dirname, '../', filePath);
   fs.unlink(filePath, e => console.log(e));
 }
