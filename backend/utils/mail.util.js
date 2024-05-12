const nodeMailer = require("nodemailer");
const MailGen = require("mailgen");
const bcrypt = require("bcryptjs");
const User = require("../models/userModel");
const crypto = require("crypto");
const { generatePassword, createAuditTrail } = require("./helpers");
const ActionType = require("./trails.enum");

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
      name: "DeskSync",
      link: "https://desksync-hdbsv2.vercel.app",
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

const sendCredentials = async (email, name,req, res) => {
  const password = generatePassword();
  let { mailGenerator } = setupTransporterAndMailGen();

  var emailMessage = {
    body: {
      name,
      intro: `<p style="font-size: 14px; color: #24292e; margin-bottom: 1rem !important;">Thank you for signing up with DeskSync! We are thrilled to welcome you on board. This is a system-generated password. Please do not share this with anyone:</p> 
      
      <div style="padding:.5rem 1.5rem; color: #24292e; border-radius: 6px; border:1px #cccccc solid; margin-bottom: 1rem !important; display: flex !important; align-items: center; width: max-content; justify-content:space-between;"><h3 style="margin: 0 !important;">${password}</h3>
      </div>
        
      <a style="padding: 0.5rem 1.5rem; color: white; background-color:#3b82f6; text-decoration:none; border-radius: 6px; border: 1px solid #3B82F6; width: max-content;display: block;margin-bottom: 1rem !important;" href="https://desksync-hdbsv2.vercel.app" target="_blank">Sign in</a>
      `,
      outro: `<p style="font-size: 14px; color: #24292e; margin-bottom: 1rem !important;">Do you need assistance or have any questions? We are here to help. 🙌</p>`,
      
    },
  };

  let mail = mailGenerator.generate(emailMessage);

  let message = {
    from: process.env.nmEMAIL,
    to: email,
    subject: "[DeskSync] HDBS Credentials",
    html: mail,
  };
  
  await sendEmail(message);

  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      username: name,
      email,
      password: hashedPassword,
    });

    if (user) {
      createAuditTrail(req, {
        actionType: "registration", actionDetails: `Registration attempt for ${email}`, status: "success",
      })
      return res.status(201).json({
        success: true,
        user,
      });
    } else {
      const error = "Invalid user data"
      res.status(400);
      createAuditTrail(req, {
        actionType: "registration", actionDetails: `Registration attempt for ${email}`, status: "failed",
      })
      throw new Error(error);
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "An error occurred." });
  }
};

const sendMagicLink = async (user, req, res) => {
  let { mailGenerator } = setupTransporterAndMailGen();
  const token = crypto.randomBytes(32).toString("hex");

  const link = `https://desksync-hdbsv2.vercel.app/reset-password/${token}/${user.id}`;

  var emailMessage = {
    body: {
      name: user.username,
      intro: `<p style="font-size: 14px; color: #24292e; margin-bottom: 1rem !important;">You recently requested a password reset for your account. Please use the following link to reset your password:</p><a style="padding: 0.5rem 1.5rem; color: white; background-color:#3b82f6; text-decoration:none; border-radius: 6px; border: 1px solid #3B82F6; width: max-content;display: block;margin-bottom: 1rem !important;" href=${link} target="_blank">Reset password</a><p style="font-size: 14px; color: #24292e">If you don’t use this link within 10 minutes, it will expire. To get a new password reset link, visit: <a href="https://desksync-hdbsv2.vercel.app/forgot-password">https://desksync-hdbsv2.vercel.app/forgot-password</a></p>`,
      outro: `<p style="font-size: 14px; color: #24292e">If you did not initiate this request or have any concerns, please contact us immediately.</p>`,
    },
  };

  let mail = mailGenerator.generate(emailMessage);

  let message = {
    from: process.env.nmEMAIL,
    to: user.email,
    subject: "[DeskSync] Please reset your password",
    html: mail,
  };

  try {
    const salt = await bcrypt.genSalt(10);
    const hashedToken = await bcrypt.hash(token, salt);

    const expiration = Date.now() + 10 * 60 * 1000;

    user.passwordResetToken.token = hashedToken;
    user.passwordResetToken.expiresAt = expiration;

    await sendEmail(message);
    await user.save();

    createAuditTrail(req, {
      actionType: ActionType.PROFILE_MANAGEMENT, actionDetails:`${user.email} requested for a password reset link`, status: "success", additionalContext: `Password reset link has been sent to ${user.email}`
    })

    return res.status(200).json({
      success: true,
      message: "Password reset link has been sent to your email",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "An error occurred." });
  }
};

const sendPasswordResetSuccess = async (user,req, res) => {
  let { mailGenerator } = setupTransporterAndMailGen();

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
    await sendEmail(message);
    await user.save();
    const resMessage = "Password changed"
    createAuditTrail(req, {
      actionType: "profile management", actionDetails:`reset password`, status: "success", additionalContext: resMessage
    })
    return res.status(200).json({
      success: true,
      message: resMessage,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "An error occurred." });
  }
};

const sendOTP = async (data, req, res) => {
  const verificationCode = Math.floor(1000000 + Math.random() * 9000).toString();
  let { mailGenerator } = setupTransporterAndMailGen();
  const {name, email} = data
  var emailMessage = {
    body: {
      name,
      intro: `<p style="font-size: 14px; color: #24292e; margin-bottom: 1rem !important;">Our system have detected that you want to sign in from another device. This verification code will expire in 10 minutes. Please use this to verify your identity:</p> 
      
      <div style="padding:.5rem 1.5rem; color: #24292e; border-radius: 6px; border:1px #cccccc solid; margin-bottom: 1rem !important; display: flex !important; align-items: center; width: max-content; justify-content:space-between;"><h3 style="margin: 0 !important;">${verificationCode}</h3>
      </div>
      `,
      outro: `<p style="font-size: 14px; color: #24292e; margin-bottom: 1rem !important;">If you did not initiate initiate this request, please change your password immediately.</p>`,
    },
  };

  console.log(data)

  let mail = mailGenerator.generate(emailMessage);

  let message = {
    from: process.env.nmEMAIL,
    to: email,
    subject: "[DeskSync] Verification Code",
    html: mail,
  };

    try {
    await sendEmail(message);

    const salt = await bcrypt.genSalt(10);
    const hashedVerificationCode = await bcrypt.hash(verificationCode, salt);

    await User.findOneAndUpdate(
      { email: data.email },
      { verification: {
        code: hashedVerificationCode,
        expiresAt: Date.now() + 10 * 60 * 1000,
      } }
    );
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
  sendPasswordResetSuccess,
  sendOTP
};
