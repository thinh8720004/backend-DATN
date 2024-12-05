const customerRegisterBody = (option) => {
  return `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Xác minh tài khoản</title>
        <style>
            body {
                font-family: 'Arial', sans-serif;
                background-color: #f0fff4; /* Xanh lá nhạt */
                margin: 0;
                padding: 0;
            }
            .email-container {
                max-width: 600px;
                margin: 20px auto;
                background-color: #ffffff;
                border: 2px solid #2d6a4f; /* Xanh lá đậm */
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            }
            .email-header {
                background-color: #40916c; /* Xanh lá cây nổi bật */
                color: #fff;
                padding: 20px;
                text-align: center;
                font-size: 28px;
                font-weight: bold;
                letter-spacing: 1px;
                position: relative;
            }
            .email-header .icon-container {
                display: flex;
                justify-content: center;
                gap: 15px;
                margin-bottom: 10px;
            }
            .email-header .icon-container img {
                width: 100px;
                height: 100px;
                object-fit: contain;
            }
            .email-body {
                padding: 30px;
                color: #333;
                text-align: center;
            }
            .email-body h2 {
                font-size: 24px;
                margin-bottom: 20px;
                color: #1b4332; /* Xanh lá đậm */
            }
            .email-body p {
                font-size: 16px;
                margin-bottom: 15px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .email-body p span {
                margin-right: 10px;
            }
            .email-button {
                display: inline-block;
                margin-top: 20px;
                padding: 15px 30px;
                font-size: 18px;
                font-weight: bold;
                background-color: #2d6a4f; /* Xanh lá đậm */
                color: #ffffff !important;
                text-decoration: none;
                border-radius: 4px;
                border: 2px solid #2d6a4f;
                transition: 0.3s;
            }
            .email-button:hover {
                background-color: #ffffff;
                color: #2d6a4f !important;
            }
            .email-footer {
                background-color: #eafaf1; /* Xanh lá nhạt */
                padding: 15px;
                font-size: 14px;
                color: #555;
                text-align: center;
            }
            .email-footer a {
                color: #2d6a4f;
                text-decoration: underline;
            }
        </style>
    </head>
    <body>
        <div class="email-container">
            <div class="email-header">
                <div class="icon-container">
                    <!-- Thay đổi đường dẫn src để đặt logo của bạn -->
                    <img src="https://res.cloudinary.com/dmklmvxkr/image/upload/v1732380732/product/24pf-logo.png" alt="Family Pharmacy 24pf Logo">
                </div>
                HIỆU THUỐC GIA ĐÌNH 24PF
            </div>
            <div class="email-body">
                <h2>Chào bạn ${option.name}, quý khách đáng yêu nhất hành tinh! 🌍</h2>
                <p>
                    <span>💊</span> Tin vui đây: Tài khoản của bạn đã gia nhập cộng đồng "Người bạn sức khỏe" tại Hiệu thuốc Gia đình 24pf!
                </p>
                <p>
                    <span>🌱</span> Nhưng khoan, để đảm bảo mọi thứ "xanh" như lá cây, bạn cần xác minh email đã nhé.
                </p>
                <p>
                    <span>✨</span> Chỉ cần nhấn nút thần kỳ bên dưới, bạn sẽ mở ra "kho tàng" sức khỏe và ưu đãi:
                </p>
                <a href=${process.env.STORE_URL}/verify-email/${option.token} class="email-button">Xác minh ngay</a>
            </div>
            <div class="email-footer">
                <p>
                    <span>☕</span> Nếu bạn không yêu cầu đăng ký, cứ thư giãn, uống trà, và bỏ qua email này nhé.
                </p>
                <p>
                    Cần giúp đỡ? <a href="#">Liên hệ ngay đội ngũ Hiệu thuốc Gia đình 24pf</a>. Chúng tôi luôn sẵn sàng!
                </p>
            </div>
        </div>
    </body>
    </html>
`;
};
module.exports = { customerRegisterBody };
