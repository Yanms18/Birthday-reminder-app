require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cron = require('node-cron');
const nodemailer = require('nodemailer');
const path = require('path');
const mongoose = require('mongoose');
const app = express();

const User = require('./models/User');


const birthdayTestRoutes = require('./Birthdaytest');
app.use(birthdayTestRoutes);

app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static(__dirname));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'Index.html'));
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error(err));

// Route: Render the registration form
app.get('/', (req, res) => {
  res.render('index'); 
});

// Route: Process form submission to register a new user
app.post('/', async (req, res) => {
  const { username, email, dob } = req.body;
  const user = new User({ username, email, dob });
  try {
    await user.save();
    res.send('Registration successful.');
  } catch (err) {
    res.status(500).send('Error registering user: ' + err.message);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

/* 
Cron Job: Every day at 7am, check for users whose birthday is today and send a greeting email.
The cron syntax '0 7 * * *' ensures that the job runs at 7:00 AM each day.
*/
cron.schedule('15 21 * * *', async () => {
  console.log('Running birthday check at 7 AM...');
  const today = new Date();
  const currentDay = today.getDate();
  const currentMonth = today.getMonth() + 1; // JavaScript months are 0-based

  try {
    // Find users where the day and month of the dob match today
    const birthdayUsers = await User.find({
      $expr: {
        $and: [
          { $eq: [{ $dayOfMonth: "$dob" }, currentDay] },
          { $eq: [{ $month: "$dob" }, currentMonth] }
        ]
      }
    });

    if (birthdayUsers.length > 0) {
      // Configure Nodemailer with Gmail SMTP
      let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_PASS
        }
      });

      // Loop over each user whose birthday is today and send an email
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
    } else {
      console.log('No birthdays today.');
    }
  } catch (e) {
    console.error('Error during birthday check:', e);
  }
});

module.exports.User = User;