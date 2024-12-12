require("dotenv").config();
const nodemailer = require("nodemailer");

const contact = async (req, res) => {
  const { name, email, message } = req.body;
  console.log("log",req.body);

  // Kiểm tra các trường có được gửi đầy đủ không
  if (!name || !email || !message) {
    return res.status(400).send({
      status: false,
      message: "All fields (name, email, message) are required!",
    });

  }

  try {
    // Cấu hình transporter cho nodemailer
    const transporter = nodemailer.createTransport({
      service: "gmail", // Hoặc SMTP server của bạn
      auth: {
        user: process.env.EMAIL_USER, // Email gửi
        pass: process.env.EMAIL_PASS, // Mật khẩu ứng dụng
      },
    });

    // Nội dung email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: "nguyenhoangquocthinh872004@gmail.com", // Email nhận
      subject: "Thông tin liên hệ mới từ khách hàng",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>Thông tin liên hệ từ khách hàng</h2>
          <p><strong>Tên:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Lời nhắn:</strong> ${message}</p>
        </div>
      `,
    };

    // Gửi email
    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.error(err);
        return res.status(500).send({
          status: false,
          message: "Không gửi được email. Vui lòng thử lại sau.",
        });
      }

      res.send({
        status: true,
        message: "Thông tin liên hệ đã được gửi thành công.",
      });
    });
  } catch (err) {
    console.error(err);
    res.status(500).send({
      status: false,
      message: "Đã xảy ra lỗi. Vui lòng thử lại sau.",
    });
  }
};

module.exports = { contact };