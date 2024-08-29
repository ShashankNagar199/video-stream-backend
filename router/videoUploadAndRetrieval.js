const express = require('express');
const multer = require('multer');
const path = require('path');
const app=express();
const Video = require('../models/videoSchema');
const authMiddleware = require('../middleware/authMiddleware'); 
const router = express.Router();
const fs=require('fs');
const User = require('../models/userSchema');
app.use(express.static('public'));

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/videos'); 
    },
    filename: (req, file, cb) => {
        cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 6 * 1024 * 1024 }, // 6MB
    fileFilter: (req, file, cb) => {
        const filetypes = /mp4/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        if (extname) {
            return cb(null, true);
        } else {
            cb('Error: Only MP4 format is allowed!');
        }
    },
}).single('video');

router.post('/upload', authMiddleware, (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ message: err });
        }
        const { title, description } = req.body;
        if (title.length > 30) {
            return res.status(400).json({ message: 'Title must be 30 words max' });
        }
        if (description && description.length > 500) {
            return res.status(400).json({ message: 'Description must be 500 characters max' });
        }

        const videoUrl = `/videos/${req.file.filename}`;
        const video = new Video({ 
            userId: req.user.id, title, videoUrl, description  
        });

        try {
            await video.save();
            res.json({ message: 'Video uploaded successfully' });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
});

router.get('/videos', authMiddleware, async (req, res) => {
    try {
        const videos = await Video.find({ userId: req.user.id });
        res.json(videos);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/videos-by-users', authMiddleware, async (req, res) => {
    try {
        // Aggregation pipeline to group videos by users
        const usersWithVideos = await User.aggregate([
            {
                $lookup: {
                    from: 'videos',
                    localField: '_id',
                    foreignField: 'userId',
                    as: 'videos'
                }
            },
            {
                $project: {
                    firstName: 1,
                    lastName: 1,
                    email: 1,
                    profilePicture: 1,
                    videos: 1
                }
            },
            {
                $sort: { "firstName": 1 }
            }
        ]);

        res.json(usersWithVideos);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/user/:userId/videos', authMiddleware, async (req, res) => {
    const { userId } = req.params;

    try {
        const videos = await Video.find({ userId: userId });
        if (!videos.length) {
            return res.status(404).json({ message: 'No videos found for this user' });
        }

        res.json(videos);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;