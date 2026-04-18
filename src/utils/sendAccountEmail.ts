import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

interface SendAccountEmailParams {
  to: string;
  name: string;
  email: string;
  password: string;
  role: string;
}

interface HafalanEmailParams {
  ortuName: string;
  santriName: string;
  tanggalHafalan: Date;
  namaSurah: string;
  jumlahAyat: number;
  ayatNomorList: number[];
  status: string;
  kualitas?: string;
  keterangan?: string;
  catatan?: string;
  emailOrtu: string;
}

interface sendUpdateEmailParams {
  to: string;
  name: string;
  oldEmail: string | undefined;
  newEmail: string | undefined;
  role: string;
  passwordChanged: boolean;
  newPassword: string | null;
}

export const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendAccountEmail = async ({ to, name, email, password, role }: SendAccountEmailParams) => {

  const htmlContent = `
    <p>Assalamu'alaikum ${name},</p>
    <p>Akun ${role} Anda sudah dibuat oleh admin. Berikut detail login:</p>
    <ul>
      <li>${role === 'Santri' ? 'Nama Login' : 'Email'}: <b>${email}</b></li>
      <li>Password: <b>${password}</b></li>
    </ul>
    <p>Silakan login menggunakan email dan password di atas.</p>
    <p>Peringatan: </p>
    <ul>
      <li>jangan pernah memberikan password ini kepada siapapun</li>
      <li>Segera Ubah Password, sesuai keinginan anda.</li>
    </ul>
    <p>Terima kasih.</p>
  `;

  await transporter.sendMail({
    from: `"Admin Pondok Pesantren" <${process.env.EMAIL_USER}>`,
    to: to,
    subject: `Akun ${role} Anda Telah Dibuat`,
    html: htmlContent,
  });
};

export const sendHafalanEmail = async ({ ortuName, santriName, tanggalHafalan, namaSurah, jumlahAyat, ayatNomorList, status, kualitas, keterangan, catatan, emailOrtu }: HafalanEmailParams) => {
  const tanggalFormatted = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(tanggalHafalan);

  // Format the list of ayat numbers
  const ayatListFormatted = ayatNomorList.join(", ");

  const htmlContent = `
    <p>Assalamualaikum <b>${ortuName}</b>,</p>
    <p>Kami ingin menginformasikan bahwa anak Anda, <b>${santriName}</b>, memiliki riwayat hafalan terbaru pada <b>${tanggalFormatted}</b>.</p>

    <table style="border-collapse: collapse; width: 100%; margin-top: 10px;">
      <tr>
        <td style="border: 1px solid #ccc; padding: 8px;">Surah</td>
        <td style="border: 1px solid #ccc; padding: 8px;">${namaSurah}</td>
      </tr>
      <tr>
        <td style="border: 1px solid #ccc; padding: 8px;">Jumlah Ayat</td>
        <td style="border: 1px solid #ccc; padding: 8px;">${jumlahAyat}</td>
      </tr>
      <tr>
        <td style="border: 1px solid #ccc; padding: 8px;">Nomor Ayat</td>
        <td style="border: 1px solid #ccc; padding: 8px;">${ayatListFormatted}</td>
      </tr>
      <tr>
        <td style="border: 1px solid #ccc; padding: 8px;">Status</td>
        <td style="border: 1px solid #ccc; padding: 8px;">${status}</td>
      </tr>
      ${
        kualitas
          ? `<tr>
              <td style="border: 1px solid #ccc; padding: 8px;">Kualitas</td>
              <td style="border: 1px solid #ccc; padding: 8px;">${kualitas}</td>
            </tr>`
          : ""
      }
      ${
        keterangan
          ? `<tr>
              <td style="border: 1px solid #ccc; padding: 8px;">Keterangan</td>
              <td style="border: 1px solid #ccc; padding: 8px;">${keterangan}</td>
            </tr>`
          : ""
      }
      ${
        catatan
          ? `<tr>
              <td style="border: 1px solid #ccc; padding: 8px;">Catatan</td>
              <td style="border: 1px solid #ccc; padding: 8px;">${catatan}</td>
            </tr>`
          : ""
      }
    </table>

    <p>Terima kasih atas perhatian dan dukungan Anda terhadap hafalan anak.</p>
    <p>Wassalamu'alaikum warahmatullahi wabarakatuh,</p>
    <p><b>Admin Pondok Pesantren</b></p>
  `;

  await transporter.sendMail({
    from: `"Admin Pondok Pesantren" <${process.env.EMAIL_USER}>`,
    to: emailOrtu,
    subject: `Riwayat Hafalan Baru Dari ${santriName}`,
    html: htmlContent,
  });
};

// email reset password
export const sendResetPasswordEmail = async (to: string, token: string) => {
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <h2 style="color: #2c3e50;">Reset Password</h2>
      <p>Assalamu'alaikum,</p>
      <p>Kami menerima permintaan untuk mereset password akun Anda. 
      Gunakan token berikut untuk melanjutkan proses reset password:</p>
      
      <div style="padding: 10px; background: #f4f6f8; border: 1px solid #ddd; border-radius: 5px; margin: 20px 0; font-size: 18px; font-weight: bold; color: #2c3e50;">
        ${token}
      </div>

      <p>Jika Anda tidak merasa melakukan permintaan ini, abaikan email ini.</p>
      <p>Terima kasih,<br/>Admin Pondok Pesantren</p>
    </div>
  ` 

  await transporter.sendMail({
    from: `"Admin Pondok Pesantren" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Reset Password Akun Anda",
    html: htmlContent,
  });
};

export const sendUpdateEmail = async ({ to, name, oldEmail, newEmail, role, passwordChanged, newPassword }: sendUpdateEmailParams) => {
  const emailChanged = oldEmail && newEmail && oldEmail !== newEmail;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <h2 style="color: #2c3e50;">Assalamu'alaikum ${name}.</h2>
      <p>Kami ingin memberitahukan bahwa akun <b>${role}</b> Anda telah diubah oleh admin.</p>
      <p>Berikut detail perubahannya:</p>
      <ul style="background:#f9f9f9; padding:10px 15px; border-radius:8px; list-style-type:none;">
        ${emailChanged 
          ? `<li>📧 ${role === 'Santri' ? 'Nama Login' : 'Email'} lama: <b>${oldEmail}</b></li><li>📧 ${role === 'Santri' ? 'Nama Login' : 'Email'} baru: <b>${newEmail}</b></li>` 
          : ''
        }
        ${passwordChanged 
          ? `<li>🔑 Password baru: <b>${newPassword}</b></li>` 
          : ''
        }
      </ul>
      <p style="margin-top:20px;">Jika Anda tidak merasa melakukan perubahan ini, segera hubungi administrator.</p>
      <p>Terima kasih.<br/>Admin Pondok Pesantren</p>
    </div>
  `;

  await transporter.sendMail({
    from: `"Admin Pondok Pesantren" <${process.env.EMAIL_USER}>`,
    to,
    subject: `Perubahan Akun ${role} Anda`,
    html: htmlContent,
  });
};