require('dotenv').config();        // ← load .env before using process.env
const express = require('express');
const nodemailer = require('nodemailer');
const User = require('./models/User');
const router = express.Router();

router.get('/test-birthday-check', async (req, res) => {
  const today = new Date();
  const currentDay = today.getDate();
  const currentMonth = today.getMonth() + 1;

  try {
    const birthdayUsers = await User.find({
      $expr: {
        $and: [
          { $eq: [{ $dayOfMonth: "$dob" }, currentDay] },
          { $eq: [{ $month: "$dob" }, currentMonth] }
        ]
      }
    });

    if (birthdayUsers.length > 0) {
      let transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,              // SSL
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_PASS
        }
      });

      // optional: verify connection configuration
      transporter.verify((err, success) => {
        if (err) console.error('SMTP Connection Error:', err);
        else console.log('SMTP Ready:', success);
      });

      await Promise.all(birthdayUsers.map(user => {
        let mailOptions = {
          from: process.env.GMAIL_USER,
          to: user.email,
          subject: 'Happy Birthday!',
          html: `<h1>Happy Birthday, ${user.username}!</h1>
                 <p>May this special day bring you abundant blessings, answered prayers, and joyful moments 🎉🙏.
                 Wishing you a year filled with peace, love, and endless happiness! 🌟</p>`
        };
        return transporter.sendMail(mailOptions);
      }));

      res.send('Birthday check triggered. Emails sent if any birthdays match today.');
    } else {
      res.send('No birthdays today.');
    }
  } catch (e) {
    console.error('Error during birthday check:', e);
    res.status(500).send('Error running birthday check.');
  }
});

module.exports = router;