require("dotenv").config();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Customer = require("../models/Customer");
const { signInToken, tokenForVerify } = require("../config/auth");
const { sendEmail } = require("../lib/email-sender/sender");
const {
  customerRegisterBody,
} = require("../lib/email-sender/templates/register");
const {
  forgetPasswordEmailBody,
} = require("../lib/email-sender/templates/forget-password");

const crypto = require("crypto");
const nodemailer = require("nodemailer");

const verifyEmailAddress = async (req, res) => {
  const isAdded = await Customer.findOne({ email: req.body.email });
  if (isAdded) {
    return res.status(403).send({
      status: false,
      message: "This Email already Added!",
    });
  } else {
    const token = tokenForVerify(req.body);
    const option = {
      name: req.body.name,
      email: req.body.email,
      token: token,
    };
    const body = {
      from: process.env.EMAIL_USER,
      to: `${req.body.email}`,
      subject: "Email Activation",
      subject: "Verify Your Email",
      html: customerRegisterBody(option),
    };

    const message = "Please check your email to verify your account!";
    sendEmail(body, res, message);
  }
};

const registerCustomer = async (req, res, next) => {
  const token = req.params.token;
  try {
    if (!token) {
      return res.status(401).send({
        status: false,
        message: "Token is required",
      });
    }
    const { name, email, password } = jwt.decode(token);
    const isAdded = await Customer.findOne({ email: email });

    if (isAdded) {
      const token = signInToken(isAdded);
      return res.send({
        status: true,
        token,
        _id: isAdded._id,
        name: isAdded.name,
        email: isAdded.email,
        message: "Email Already Verified!",
      });
    }

    jwt.verify(
      token,
      process.env.JWT_SECRET_FOR_VERIFY,
      async (err, decoded) => {
        if (err) {
          return res.status(401).send({
            status: false,
            message: "Token Expired, Please try again!",
          });
        } else {
          const newUser = new Customer({
            name,
            email,
            password: bcrypt.hashSync(password),
          });
          await newUser.save();
          const token = signInToken(newUser);
          res.send({
            status: true,
            token,
            _id: newUser._id,
            name: newUser.name,
            email: newUser.email,
            message: "Email Verified, Please Login Now!",
          });
        }
      }
    );
  } catch (error) {
    next(error);
  }
};

const addAllCustomers = async (req, res) => {
  try {
    await Customer.deleteMany();
    await Customer.insertMany(req.body);
    res.send({
      status: true,
      message: "Added all users successfully!",
    });
  } catch (err) {
    res.status(500).send({
      status: false,
      message: err.message,
    });
  }
};

const loginCustomer = async (req, res) => {
  try {
    const customer = await Customer.findOne({ email: req.body.email });
    console.log(req.body);
    console.log("Hashed password: ", bcrypt.hashSync(req.body.password));
    if (
      customer &&
      customer.password &&
      bcrypt.compareSync(req.body.password, customer.password)
    ) {
      const token = signInToken(customer);
      res.send({
        token,
        _id: customer._id,
        name: customer.name,
        email: customer.email,
        address: customer.address,
        phone: customer.phone,
        image: customer.image,
      });
    } else {
      res.status(401).send({
        message: "Invalid user or password!",
      });
    }
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const forgetPassword = async (req, res) => {
  const isAdded = await Customer.findOne({ email: req.body.verifyEmail });
  if (!isAdded) {
    return res.status(404).send({
      status: false,
      message: "User Not found with this email!",
    });
  } else {
    const token = tokenForVerify(isAdded);
    const option = {
      name: isAdded.name,
      email: isAdded.email,
      token: token,
    };

    const body = {
      from: process.env.EMAIL_USER,
      to: `${req.body.verifyEmail}`,
      subject: "Password Reset",
      html: forgetPasswordEmailBody(option),
    };

    const message = "Please check your email to reset password!";
    sendEmail(body, res, message);
  }
};

const resetPassword = async (req, res) => {
  const { email } = req.body;

  // Kiểm tra email có được gửi không
  if (!email) {
    return res.status(400).send({
      status: false,
      message: "Email is required!",
    });
  }

  try {
    // Tìm khách hàng dựa trên email
    const customer = await Customer.findOne({ email });
    if (!customer) {
      return res.status(404).send({
        status: false,
        message: "Customer not found!",
      });
    }

    // Sinh mật khẩu ngẫu nhiên
    const newPassword = crypto.randomBytes(8).toString("hex"); // Tạo mật khẩu 16 ký tự

    // Băm mật khẩu mới và lưu vào cơ sở dữ liệu
    customer.password = bcrypt.hashSync(newPassword, 10);
    await customer.save();

    const changePasswordLink = `http://localhost:3000/changePassword`;

    // Gửi email chứa mật khẩu mới
    const transporter = nodemailer.createTransport({
      service: "gmail", // Hoặc SMTP server của bạn
      auth: {
        user: process.env.EMAIL_USER, // Email gửi
        pass: process.env.EMAIL_PASS, // Mật khẩu ứng dụng
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Mật khẩu mới của bạn",
      html: `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>Đặt lại mật khẩu</h2>
      <p>Mật khẩu mới của bạn là: <strong>${newPassword}</strong>. Vui lòng thay đổi nó sau khi đăng nhập.</p>
      <p>Nhấn vào nút bên dưới để thay đổi mật khẩu của bạn:</p>
      <a href="${changePasswordLink}" 
         style="
           display: inline-block;
           background-color: #4CAF50;
           color: white;
           text-decoration: none;
           padding: 10px 20px;
           font-size: 16px;
           border-radius: 5px;
           text-align: center;"
         target="_blank">
         Thay đổi mật khẩu
      </a>
      <p>Nếu bạn không yêu cầu thay đổi mật khẩu, vui lòng bỏ qua email này.</p>
    </div>
  `,
    };

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
        message: "Mật khẩu mới đã được gửi tới email của bạn.",
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

const changePassword = async (req, res) => {
  try {
    const customer = await Customer.findOne({ email: req.body.email });
    if (!customer.password) {
      return res.send({
        status: false,
        message:
          "For change password,You need to sign in with email & password!",
      });
    } else if (
      customer &&
      bcrypt.compareSync(req.body.currentPassword, customer.password)
    ) {
      customer.password = bcrypt.hashSync(req.body.newPassword);
      await customer.save();
      res.send({
        status: true,
        message: "Your password change successfully!",
      });
    } else {
      res.status(401).send({
        status: false,
        message: "Invalid email or current password!",
      });
    }
  } catch (err) {
    res.status(500).send({
      status: false,
      message: err.message,
    });
  }
};

const signUpWithProvider = async (req, res) => {
  try {
    // const { user } = jwt.decode(req.body.params);
    const user = req.body;

    // console.log("user", user);
    const isAdded = await Customer.findOne({ email: user.email });
    if (isAdded) {
      if (bcrypt.compareSync(user.password, isAdded.password)) {
        const token = signInToken(isAdded);
        res.send({
          token,
          _id: isAdded._id,
          name: isAdded.name,
          email: isAdded.email,
          address: isAdded.address,
          phone: isAdded.phone,
          image: isAdded.image,
        });
      } else {
        res.status(401).send({
          message:
            "Email already exists, please login with your email & password!",
        });
      }
    } else {
      const newPassword = bcrypt.hashSync(user.password);
      const newUser = new Customer({
        name: user.name,
        email: user.email,
        image: user.picture,
        password: newPassword,
      });

      const signUpCustomer = await newUser.save();
      const token = signInToken(signUpCustomer);
      res.send({
        token,
        _id: signUpCustomer._id,
        name: signUpCustomer.name,
        email: signUpCustomer.email,
        image: signUpCustomer.image,
      });
    }
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const getAllCustomers = async (req, res) => {
  try {
    const users = await Customer.find({}).sort({ _id: -1 });
    res.send(users);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

const getCustomerById = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    res.send(customer);
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const updateCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (customer) {
      customer.name = req.body.name;
      customer.email = req.body.email;
      customer.address = req.body.address;
      customer.phone = req.body.phone;
      customer.image = req.body.image;
      const updatedUser = await customer.save();
      const token = signInToken(updatedUser);
      res.send({
        token,
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        address: updatedUser.address,
        phone: updatedUser.phone,
        image: updatedUser.image,
      });
    }
  } catch (err) {
    res.status(404).send({
      message: "Your email is not valid!",
    });
  }
};

const deleteCustomer = async (req, res) => {
  try {
    const result = await Customer.deleteOne({ _id: req.params.id });
    if (result.deletedCount === 0) {
      return res.status(404).send({
        message: "User not found!",
      });
    }
    res.status(200).send({
      message: "User Deleted Successfully!",
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

module.exports = {
  loginCustomer,
  registerCustomer,
  addAllCustomers,
  signUpWithProvider,
  verifyEmailAddress,
  forgetPassword,
  changePassword,
  resetPassword,
  getAllCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
};