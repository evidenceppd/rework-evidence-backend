'use strict';

const { Router } = require('express');
const controller = require('./blog.controller');

const router = Router();

/**
 * @openapi
 * /api/blog:
 *   get:
 *     tags: [Blog]
 *     summary: Get blog page content
 *     responses:
 *       200:
 *         description: Blog page content
 *       404:
 *         description: Blog page not found
 */
router.get('/', controller.getPage);

/**
 * @openapi
 * /api/blog:
 *   put:
 *     tags: [Blog]
 *     summary: Create or update blog page content
 *     description: Requires the home page to exist first.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, subtitle, cardFooter]
 *             properties:
 *               title: { type: string }
 *               subtitle: { type: string }
 *               cardFooter:
 *                 type: object
 *                 properties:
 *                   title: { type: string }
 *                   subtitle: { type: string }
 *     responses:
 *       200:
 *         description: Blog page saved
 *       400:
 *         description: Validation error
 */
router.put('/', controller.upsertPage);

/**
 * @openapi
 * /api/blog/posts:
 *   get:
 *     tags: [Blog Posts]
 *     summary: List all blog posts (ordered by newest first)
 *     responses:
 *       200:
 *         description: List of blog posts
 *       404:
 *         description: Blog page not found
 */
router.get('/posts', controller.listPosts);

/**
 * @openapi
 * /api/blog/posts:
 *   post:
 *     tags: [Blog Posts]
 *     summary: Create a new blog post
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [slug, segment, title, subtitle, content, blogImage]
 *             properties:
 *               slug: { type: string, example: 'meu-primeiro-post' }
 *               segment: { type: string }
 *               title: { type: string }
 *               subtitle: { type: string }
 *               content: { type: string }
 *               blogImage: { type: string }
 *     responses:
 *       201:
 *         description: Blog post created
 *       400:
 *         description: Validation error or slug already in use
 */
router.post('/posts', controller.createPost);

/**
 * @openapi
 * /api/blog/posts/{id}:
 *   get:
 *     tags: [Blog Posts]
 *     summary: Get a blog post by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Blog post
 *       404:
 *         description: Blog post not found
 */
router.get('/posts/:id', controller.getPost);

/**
 * @openapi
 * /api/blog/posts/{id}:
 *   put:
 *     tags: [Blog Posts]
 *     summary: Update a blog post
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               slug: { type: string }
 *               segment: { type: string }
 *               title: { type: string }
 *               subtitle: { type: string }
 *               content: { type: string }
 *               blogImage: { type: string }
 *     responses:
 *       200:
 *         description: Blog post updated
 *       400:
 *         description: Slug already in use
 *       404:
 *         description: Blog post not found
 */
router.put('/posts/:id', controller.updatePost);

/**
 * @openapi
 * /api/blog/posts/{id}:
 *   delete:
 *     tags: [Blog Posts]
 *     summary: Delete a blog post
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: Blog post deleted
 *       404:
 *         description: Blog post not found
 */
router.delete('/posts/:id', controller.deletePost);

/**
 * @openapi
 * /api/blog/posts/{id}/views:
 *   patch:
 *     tags: [Blog Posts]
 *     summary: Increment view count for a blog post
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: View count incremented
 *       404:
 *         description: Blog post not found
 */
router.patch('/posts/:id/views', controller.incrementViews);

module.exports = router;
