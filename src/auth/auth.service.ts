import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './schemas/user.schema';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { SignUpDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { v4 as uuidv4 } from 'uuid';
import { CurrentUserDto } from './dto/current-user.dto';
import { EmailService } from './email.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { Profile } from 'passport-google-oauth20';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private jwtService: JwtService,
    private emailService: EmailService,
  ) {}

  async validateUserByGoogle(profile: Profile): Promise<User> {
    const firstName = profile.name?.givenName ?? 'Unknown';
    const lastName = profile.name?.familyName ?? 'Unknown';
    const email = profile.emails?.[0]?.value;
  
    if (!email) {
      throw new UnauthorizedException('Email is required from Google profile');
    }
  
    let user = await this.userModel.findOne({ googleId: profile.id });
  
    if (!user) {
      user = await this.userModel.create({
        firstName,
        lastName,
        email,
        googleId: profile.id,
        userId: uuidv4(),
        role: 'student', // Default role
      });
    }
  
    return user; // Return the full user object
  }
  async findUserByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ email }).exec();
  }

  async signUp(signUpDto: SignUpDto): Promise<{ message: string; token: string }> {
    const { email, password, firstName, lastName, role } = signUpDto;

    const existingUser = await this.findUserByEmail(email);

    if (existingUser) {
      try {
        const token = await this.login({ email, password });
        return { message: 'User already exists, logged in successfully.', token };
      } catch (error) {
        throw new UnauthorizedException('User with this email already exists but provided password is incorrect');
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = uuidv4();

    const user = await this.userModel.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      userId: uuidv4(),
      emailVerificationToken: verificationToken,
      isEmailVerified: false,
      role: role || 'student',
    });

    const verificationLink = `http://localhost:3000/verify-email?token=${verificationToken}`;
    await this.emailService.sendEmail({
      to: email,
      subject: 'Email Verification',
      text: `Please verify your email by clicking on the following link: ${verificationLink}`,
    });

    const token = this.createToken(user._id.toString());
    return { message: 'Registration successful! Please check your email to verify your account.', token };
  }

  async login(loginDto: LoginDto): Promise<string> {
    const { email, password } = loginDto;
    const user = await this.findUserByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordMatched = await bcrypt.compare(password, user.password);
    if (!isPasswordMatched) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.createToken(user._id.toString());
  }

  createToken(userId: string): string {
    return this.jwtService.sign({ id: userId });
  }

  async getCurrentUser(userId: string): Promise<CurrentUserDto> {
    const user = await this.userModel.findById(userId).select('-password');
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      userId: user.userId,
      role: user.role,
    };
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.userModel.findOne({ email });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const token = this.jwtService.sign({ id: user._id }, { expiresIn: '1h' });
    const resetLink = `http://localhost:3000/reset-password?token=${token}`;

    await this.emailService.sendEmail({
      to: email,
      subject: 'Password Reset',
      text: `You requested a password reset. Click the link to reset your password: ${resetLink}`,
    });
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const payload = this.jwtService.verify(token);
    if (!payload) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const user = await this.userModel.findById(payload.id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();
  }

  async verifyEmail(token: string): Promise<void> {
    const user = await this.userModel.findOne({ emailVerificationToken: token });
    if (!user) {
      throw new NotFoundException('Invalid or expired token');
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    await user.save();
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto): Promise<void> {
    const { currentPassword, newPassword } = changePasswordDto;

    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isPasswordMatched = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordMatched) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedNewPassword;
    await user.save();
  }
}