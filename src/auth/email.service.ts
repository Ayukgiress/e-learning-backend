import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS, 
      },
    });
  }

  
  async sendEmail(options: { to: string; subject: string; text: string }): Promise<void> {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: options.to,
      subject: options.subject,
      text: options.text,
    };

    try {
      await this.transporter.sendMail(mailOptions);
     
    } catch (error) {
      
      throw error; 
    }
  }
}