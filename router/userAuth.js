const express = require('express');
const bcrypt = require('bcryptjs');
const app=express();
const path = require('path');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const User = require('../models/userSchema');
const authMiddleware = require('../middleware/authMiddleware'); 
const { Mandrill } = require('mandrill-api/mandrill');
const router = express.Router();
const fs=require('fs');
const nodemailer = require('nodemailer');

app.use(express.static('public'));

// Password generation algorithm
const generatePassword = (firstName, lastName, phone) => {
    return `${firstName.slice(0, 2)}${lastName.slice(-2)}${phone.slice(-4)}`;
};

const sendEmail = async (email, password) => {
    // Create a Nodemailer transporter
    const transporter = nodemailer.createTransport({
        service: 'gmail', 
        auth: {
            user: process.env.EMAIL_USER, 
            pass: process.env.EMAIL_PASS 
        }
    });

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Your Account Password',
        text: `Your password is ${password}`,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Email sent successfully');
    } catch (error) {
        console.error('Error sending email:', error);
    }
};
const profileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/images'); 
    },
    filename: (req, file, cb) => {
        cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`);
    },
});

const uploadProfilePicture = multer({
    storage: profileStorage,
    limits: { fileSize: 1 * 1024 * 1024 }, // 2MB limit for profile pictures
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png/; 
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        if (extname) {
            return cb(null, true);
        } else {
            cb('Error: Only JPEG and PNG formats are allowed!');
        }
    },
}).single('profilePicture'); 

router.post('/uploadProfilePicture', authMiddleware, (req, res) => {
    uploadProfilePicture(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ message: err });
        }

        const profilePictureUrl = `/images/${req.file.filename}`;
        try {
            const user = await User.findById(req.user.id);
            user.profilePicture = profilePictureUrl;
            await user.save();
            res.json({ message: 'Profile picture uploaded successfully', profilePictureUrl });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
});

router.post('/register', async (req, res) => {
    const { firstName, lastName, email, phone } = req.body;
     const password = generatePassword(firstName, lastName, phone);
    //const password="shashi12345"
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        const user = new User({ firstName, lastName, email, phone, password: hashedPassword });
        await user.save();
        sendEmail(email, password);
        res.status(201).json({ message: 'User registered successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/user', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/user/bio', authMiddleware, async (req, res) => {
    const { bio } = req.body;

    if (bio.length > 500) {
        return res.status(400).json({ message: 'Bio must be 500 words max' });
    }

    try {
        const user = await User.findById(req.user.id);
        user.bio = bio;
        await user.save();
        res.json({ message: 'Bio updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/login', async (req, res) => {
    const { firstName, password } = req.body;

    try {
        const user = await User.findOne({ firstName });
        if (!user) return res.status(400).json({ message: 'User not found' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '2d' });
        res.json({ token });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


module.exports = router;
