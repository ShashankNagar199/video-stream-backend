
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
