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
        service: 'gmail',
        secure: true,
        port: 587,
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_PASS
        }
      });

      birthdayUsers.forEach(async (user) => {
        let mailOptions = {
          from: process.env.GMAIL_USER,
          to: user.email,
          subject: 'Happy Birthday!',
          html: `<h1>Happy Birthday, ${user.username}!</h1>
                 <p>Wishing you a wonderful day filled with joy and surprises.</p>`
        };

        try {
            let info = await transporter.sendMail(mailOptions);
            console.log(`Email sent to ${user.email}: ${info.response}`);
          } catch (error) {
            console.error(`Error sending email to ${user.email}: ${error}`);
          }
        });
        
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