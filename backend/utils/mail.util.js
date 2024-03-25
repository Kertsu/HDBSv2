const nodeMailer = require("nodemailer");
const MailGen = require("mailgen");
const bcrypt = require("bcryptjs");
const User = require("../models/userModel");
const crypto = require('crypto')
const { generatePassword } = require("./helpers");

const setupTransporterAndMailGen = () => {
  let config = {
    service: "gmail",
    auth: {
      user: process.env.nmEMAIL,
      pass: process.env.nmPASSWORD,
    },
    tls: {
      rejectUnauthorized: false,
    },
  };

  let transporter = nodeMailer.createTransport(config);

  let mailGenerator = new MailGen({
    theme: "default",
    product: {
      name: "Mailgen",
      link: "https://mailgen.js/",
    },
  });

  return { transporter, mailGenerator };
};

const sendEmail = async (message) => {
  try {
    let { transporter } = setupTransporterAndMailGen();
    await transporter.sendMail(message);
  } catch (error) {
    throw new Error("Error sending email: " + error);
  }
};

const sendCredentials = async (email, name, res) => {
  const password = generatePassword()
  let { mailGenerator } = setupTransporterAndMailGen();

  var emailMessage = {
    body: {
      name,
      intro: `Thank you for signing up with <a href="https://www.facebook.com/Kertsuuu/">DeskSync</a>! We are thrilled to welcome you on board. This is a system-generated password. Please do not share this with anyone: <h1>${password}</h1>`,
      outro:
        "Do you need assistance or have any questions? Feel free to reach out to our Tech Lead at <i>kurtddbigtas@gmail.com</i>. We are here to help.",
    },
  };

  let mail = mailGenerator.generate(emailMessage);

  let message = {
    from: process.env.nmEMAIL,
    to: email,
    subject: "eMachine Hotdesk Booking System Credentials",
    html: mail,
  };

  try {
    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const user = await User.create({
      username: name,
      email,
      password: hashedPassword
    });
    
    if (user) {
      await sendEmail(message);
      return res.status(201).json({
        success: true,
        user: {
          id: user.id,
          role: user.role,
          username: user.username,
          email: user.email,
        },
      });
    } else {
      res.status(400);
      throw new Error("Invalid user data");
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "An error occurred." });
  }
};

const sendMagicLink = async (user, res) => {
  let { mailGenerator } = setupTransporterAndMailGen();
  const token = crypto.randomBytes(32).toString('hex');

  const link = `http://localhost:4200/reset-password?token=${token}&id=${user.id}`

  var emailMessage = {
    body: {
      name: user.username,
      intro: `You recently requested a password reset for your account. This link will expire in 10 minutes. Please use the following link to reset your password:<br/><br/> <a href=${link} target="_blank">Reset password</a><br/><br/><strong>If you did not initiate this request or have any concerns, please contact us immediately.</strong>`,
      outro:
        "Do you need assistance or have any questions? Feel free to reach out to our Tech Lead at <i>kurtddbigtas@gmail.com</i>. We are here to help.",
    },
  };

  let mail = mailGenerator.generate(emailMessage);

  let message = {
    from: process.env.nmEMAIL,
    to: user.email,
    subject: "Password Reset",
    html: mail,
  };

  try {

    const salt = await bcrypt.genSalt(10)
    const hashedToken = await bcrypt.hash(token, salt);
    
    const expiration = Date.now() + (10*60*1000)

    user.passwordResetToken.token = hashedToken
    user.passwordResetToken.expiresAt = expiration

    await sendEmail(message)
    await user.save()

    res.status(200).json({
      success: true,
      message: "Password reset link has been sent to your email"
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "An error occurred." });
  }
}

const sendPasswordResetSuccess = async (user, res) => {
  let { mailGenerator } = setupTransporterAndMailGen();
  const token = crypto.randomBytes(32).toString('hex');

  const link = `http://localhost:4200/reset-password/${token}/${user.id}`

  var emailMessage = {
    body: {
      name: user.username,
      intro: `Your password has been successfully changed. You can now log in to your account with your new password.`,
      outro:
        "Do you need assistance or have any questions? Feel free to reach out to our Tech Lead at <i>kurtddbigtas@gmail.com</i>. We are here to help.",
    },
  };

  let mail = mailGenerator.generate(emailMessage);

  let message = {
    from: process.env.nmEMAIL,
    to: user.email,
    subject: "Password Reset Successfully",
    html: mail,
  };

  try {
    await sendEmail(message)
    await user.save();
    return res.status(200).json({
      success: true,
      error: "Password changed",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "An error occurred." });
  }
}

//
// const resendVerificationCodeMail = async (email, name, res) => {
//   const verificationCode = Math.floor(10000 + Math.random() * 9000).toString();
//   let { mailGenerator } = setupTransporterAndMailGen();

//   var emailMessage = {
//     body: {
//       name,
//       intro: `Thank you for signing up with DeskSync! We are thrilled to welcome you on board. Here is your verification code. Please do not share this with anyone: <h1>${verificationCode}</h1>`,
//       outro:
//         "Do you need assistance or have any questions? Feel free to reach out to our Tech Lead at <i>kurtddbigtas@gmail.com</i>. We are here to help.",
//     },
//   };

//   let mail = mailGenerator.generate(emailMessage);

//   let message = {
//     from: process.env.nmEMAIL,
//     to: email,
//     subject: "eMachine Hotdesk Booking System Verification Code",
//     html: mail,
//   };

//   try {
//     await sendEmail(message);

//     const salt = await bcrypt.genSalt(10);
//     const hashedVerificationCode = await bcrypt.hash(verificationCode, salt);

//     const updatedUser = await User.findOneAndUpdate(
//       { email },
//       { verificationCode: hashedVerificationCode }
//     );

//     if (updatedUser) {
//       return res.status(200).json({
//         message: `Verification code has been resent to ${email}`,
//       });
//     } else {
//       throw new Error("User not found");
//     }
//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({ error: "An error occurred." });
//   }
// };

// const sendApplicationSuccess = async (email, name) => {
//   let { transporter, mailGenerator } = setupTransporterAndMailGen();

//   var emailMessage = {
//     body: {
//       name,
//       intro: `We are delighted to inform you that your application has been approved by our team of administrators, and your account is now fully activated.`,
//       outro:
//         "Do you need assistance or have any questions? Feel free to reach out to our Tech Lead at <i>kurtddbigtas@gmail.com</i>. We are here to help.",
//     },
//   };

//   let mail = mailGenerator.generate(emailMessage);

//   let message = {
//     from: process.env.nmEMAIL,
//     to: email,
//     subject: "eMachine Hotdesk Booking System Application Success",
//     html: mail,
//   };

//   try {
//     await sendEmail(message);
//   } catch (error) {
//     console.error("Error sending email: " + error);
//   }
// };

// const sendReservationApproved = async (email, name, deskNumber) => {
//   let { transporter, mailGenerator } = setupTransporterAndMailGen();

//   var emailMessage = {
//     body: {
//       name,
//       intro: `We are pleased to inform you that your reservation application for <strong>Desk ${deskNumber}</strong> has been approved. Have a great day ahead!`,
//       outro:
//         "Do you need assistance or have any questions? Feel free to reach out to our Tech Lead at <i>kurtddbigtas@gmail.com</i>. We are here to help.",
//     },
//   };

//   let mail = mailGenerator.generate(emailMessage);

//   let message = {
//     from: process.env.nmEMAIL,
//     to: email,
//     subject: "eMachine Hotdesk Booking System Reservation Approved",
//     html: mail,
//   };

//   try {
//     await sendEmail(message);
//   } catch (error) {
//     console.error("Error sending email: " + error);
//   }
// };

module.exports = {
  sendCredentials,
  sendMagicLink,
  sendPasswordResetSuccess
};
